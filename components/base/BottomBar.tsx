import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function BottomBarComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const shared = containerProps(component);
  const classes = [
    "fixed bottom-0 left-0 right-0 flex justify-around items-center border-t bg-white p-2",
    shared.className,
  ]
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
