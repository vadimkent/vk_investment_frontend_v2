import { fetchScreen } from "@/lib/middleend";
import { ComponentRenderer } from "@/components/renderer";

export default async function Screen({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const screen = await fetchScreen(`/screens/${path.join("/")}`);
  return <ComponentRenderer component={screen} />;
}
