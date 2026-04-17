export function stripScreens(url: string): string {
  return url.replace(/^\/screens/, "");
}
