import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function ColumnComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const fill = component.props.fill === true;
  const classes = [
    "flex flex-col",
    fill ? "flex-1 min-h-0" : null,
    shared.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-sdui-id={component.id}
      className={classes}
      style={Object.keys(shared.style).length ? shared.style : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
