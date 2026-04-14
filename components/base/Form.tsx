import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";

export function FormComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const loading = component.props.loading === true;
  const loadingClass = loading ? " opacity-50 pointer-events-none" : "";
  const classes = [shared.className, loadingClass].filter(Boolean).join(" ");

  return (
    <div
      data-sdui-id={component.id}
      data-sdui-form="true"
      className={classes || undefined}
      style={Object.keys(shared.style).length ? shared.style : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
