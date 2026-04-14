import type { SDUIComponent } from "@/lib/types/sdui";

export function SpacerComponent({ component }: { component: SDUIComponent }) {
  const size = component.props.size as string | undefined;
  return <div style={size ? { height: size } : undefined} />;
}
