import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";

export function ContentSlotComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  return (
    <div className="flex-1">
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
