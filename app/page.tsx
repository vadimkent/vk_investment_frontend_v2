import { fetchShell, fetchScreen } from "@/lib/middleend";
import { ComponentRenderer } from "@/components/renderer";
import type { SDUIComponent } from "@/lib/types/sdui";

function injectScreen(
  shell: SDUIComponent,
  screen: SDUIComponent,
): SDUIComponent {
  if (shell.type === "content_slot") {
    return { ...shell, children: [screen] };
  }
  if (!shell.children) return shell;
  return {
    ...shell,
    children: shell.children.map((child) => injectScreen(child, screen)),
  };
}

export default async function Home() {
  const [shell, screen] = await Promise.all([
    fetchShell(),
    fetchScreen("/screens/home"),
  ]);
  const page = injectScreen(shell, screen);
  return <ComponentRenderer component={page} />;
}
