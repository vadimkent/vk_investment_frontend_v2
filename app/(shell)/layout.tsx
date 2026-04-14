import { fetchShell } from "@/lib/middleend";
import { ComponentRenderer } from "@/components/renderer";
import { ShellChildrenProvider } from "@/components/shell-children-context";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await fetchShell();
  return (
    <ShellChildrenProvider value={children}>
      <ComponentRenderer component={shell} />
    </ShellChildrenProvider>
  );
}
