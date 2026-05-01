import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";

export function ListComponent({ component }: { component: SDUIComponent }) {
  const orientation = (component.props.orientation as string) ?? "vertical";
  const isHorizontal = orientation === "horizontal";
  const className = isHorizontal ? "flex overflow-x-auto" : "overflow-y-auto";

  return (
    <div data-sdui-id={component.id} className={className}>
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
