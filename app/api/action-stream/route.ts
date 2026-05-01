import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MIDDLEEND_URL = process.env.MIDDLEEND_URL ?? "http://localhost:8081";

async function proxy(
  request: NextRequest,
  method: "GET" | "POST",
): Promise<Response> {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  const platform = request.headers.get("X-Platform") ?? "web";
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const headers: Record<string, string> = {
    "X-Platform": platform,
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (method === "POST") {
    const contentType = request.headers.get("Content-Type");
    if (contentType) headers["Content-Type"] = contentType;
    body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${MIDDLEEND_URL}${url}`, {
      method,
      headers,
      body,
      signal: request.signal,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable" },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream_${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  const outHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  return new Response(upstream.body, {
    status: 200,
    headers: outHeaders,
  });
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxy(request, "POST");
}
