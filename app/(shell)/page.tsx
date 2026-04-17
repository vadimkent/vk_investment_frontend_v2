import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { fetchShell } from "@/lib/middleend";
import { stripScreens } from "@/lib/strip-screens";
import type { SDUIComponent } from "@/lib/types/sdui";

function findDefaultRoute(shell: SDUIComponent): string {
  const navMain = shell.children?.find((c) => c.type === "nav_main");
  const firstNavItem = navMain?.children?.[0];
  const action = firstNavItem?.actions?.[0];
  if (action?.type === "navigate" && action.url) {
    return stripScreens(action.url);
  }
  return "/portfolio";
}

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const shell = await fetchShell();
  const defaultRoute = findDefaultRoute(shell);
  redirect(defaultRoute);
}
