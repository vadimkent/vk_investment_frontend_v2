import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MIDDLEEND_URL = process.env.MIDDLEEND_URL ?? "http://localhost:8081";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  const platform = request.headers.get("X-Platform") ?? "web";
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const headers: Record<string, string> = { "X-Platform": platform };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${MIDDLEEND_URL}${url}`, {
      method: "GET",
      headers,
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable" },
      { status: 502 },
    );
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (location) {
      return NextResponse.redirect(new URL(location, request.url), 302);
    }
  }

  const outHeaders = new Headers();
  const cd = response.headers.get("Content-Disposition");
  if (cd) outHeaders.set("Content-Disposition", cd);
  const ct = response.headers.get("Content-Type");
  if (ct) outHeaders.set("Content-Type", ct);
  const cl = response.headers.get("Content-Length");
  if (cl) outHeaders.set("Content-Length", cl);

  return new NextResponse(response.body, {
    status: response.status,
    headers: outHeaders,
  });
}
