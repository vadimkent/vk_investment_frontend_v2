import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function GroupComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const hasShared = shared.className || Object.keys(shared.style).length;

  if (!hasShared) {
    return (
      <>
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </>
    );
  }

  return (
    <div
      className={shared.className || undefined}
      style={Object.keys(shared.style).length ? shared.style : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
