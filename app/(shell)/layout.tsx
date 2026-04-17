import { cookies } from "next/headers";
import { fetchShell } from "@/lib/middleend";
import { ComponentRenderer } from "@/components/renderer";
import { ShellChildrenProvider } from "@/components/shell-children-context";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return <>{children}</>;
  }

  const shell = await fetchShell();
  return (
    <ShellChildrenProvider value={children}>
      <ComponentRenderer component={shell} />
    </ShellChildrenProvider>
  );
}
