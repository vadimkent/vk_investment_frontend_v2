import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function NavFooterComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const shared = containerProps(component);
  const classes = ["p-4 border-t", shared.className].filter(Boolean).join(" ");

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
