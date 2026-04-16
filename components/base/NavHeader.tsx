import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function NavHeaderComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const shared = containerProps(component);
  const classes = ["flex items-center gap-3 p-4 border-b border-border", shared.className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={Object.keys(shared.style).length ? shared.style : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
