import type { SDUIComponent } from "@/lib/types/sdui";

export function DividerComponent({ component }: { component: SDUIComponent }) {
  const orientation = (component.props.orientation as string) ?? "horizontal";
  const isVertical = orientation === "vertical";

  if (isVertical) {
    return <div className="border-l h-full mx-2" />;
  }

  return <hr className="border-t my-2" />;
}
