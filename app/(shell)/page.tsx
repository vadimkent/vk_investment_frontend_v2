import { fetchScreen } from "@/lib/middleend";
import { ComponentRenderer } from "@/components/renderer";

export default async function Home() {
  const screen = await fetchScreen("/screens/home");
  return <ComponentRenderer component={screen} />;
}
