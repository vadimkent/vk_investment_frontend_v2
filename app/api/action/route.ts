import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MIDDLEEND_URL = process.env.MIDDLEEND_URL ?? "http://localhost:8081";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const platform = request.headers.get("X-Platform") ?? "web";

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Platform": platform,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${MIDDLEEND_URL}${body.endpoint}`, {
    method: body.method ?? "POST",
    headers,
    body: JSON.stringify(body.data),
  });

  const data = await response.json();

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
