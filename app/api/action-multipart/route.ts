import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MIDDLEEND_URL = process.env.MIDDLEEND_URL ?? "http://localhost:8081";

export async function POST(request: NextRequest) {
  const inForm = await request.formData();
  const endpoint = String(inForm.get("__endpoint") ?? "");
  const method = String(inForm.get("__method") ?? "POST");
  const platform = request.headers.get("X-Platform") ?? "web";

  if (!endpoint) {
    return NextResponse.json(
      { action: "none", error: "missing_endpoint" },
      { status: 400 },
    );
  }

  const outForm = new FormData();
  for (const [k, v] of inForm.entries()) {
    if (k === "__endpoint" || k === "__method") continue;
    outForm.append(k, v);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const headers: Record<string, string> = { "X-Platform": platform };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${MIDDLEEND_URL}${endpoint}`, {
      method,
      headers,
      body: outForm,
    });
  } catch {
    return NextResponse.json(
      { action: "none", error: "upstream_unreachable" },
      { status: 502 },
    );
  }

  let data: Record<string, unknown> & {
    auth?: { token?: string };
    auth_changed?: boolean;
  };
  try {
    data = await response.json();
  } catch {
    return NextResponse.json(
      { action: "none", error: "upstream_invalid_response" },
      { status: 502 },
    );
  }

  if (response.status === 401) {
    return NextResponse.json(data, { status: 401 });
  }

  let authToken: string | undefined;
  if (data.auth && data.auth.token) {
    authToken = data.auth.token;
    delete data.auth;
    data.auth_changed = true;
  }

  const res = NextResponse.json(data, { status: response.status });

  if (authToken) {
    res.cookies.set("token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }

  return res;
}
