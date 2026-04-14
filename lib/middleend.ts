import { cookies } from "next/headers";
import type { SDUIComponent } from "@/lib/types/sdui";

const MIDDLEEND_URL = process.env.MIDDLEEND_URL ?? "http://localhost:8081";

async function serverHeaders(
  platform?: string,
): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    "X-Platform": platform ?? "web",
    "Content-Type": "application/json",
  };
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

async function fetchSDUI(
  path: string,
  platform?: string,
): Promise<SDUIComponent> {
  const response = await fetch(`${MIDDLEEND_URL}${path}`, {
    cache: "no-store",
    headers: await serverHeaders(platform),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

export async function fetchShell(platform?: string): Promise<SDUIComponent> {
  return fetchSDUI("/shell", platform);
}

export async function fetchScreen(
  path: string,
  platform?: string,
): Promise<SDUIComponent> {
  return fetchSDUI(path, platform);
}
