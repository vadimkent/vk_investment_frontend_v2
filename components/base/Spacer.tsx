import type { SDUIComponent } from "@/lib/types/sdui";
import { gapMap } from "@/lib/sdui-utils";

export function SpacerComponent({ component }: { component: SDUIComponent }) {
  const size = component.props.size as string | undefined;
  const height = size && gapMap[size] ? gapMap[size] : undefined;
  return <div style={height ? { height } : undefined} />;
}
