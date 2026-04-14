import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function NavMainComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const classes = ["flex-1 overflow-y-auto p-2", shared.className]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      className={classes}
      style={Object.keys(shared.style).length ? shared.style : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </nav>
  );
}
