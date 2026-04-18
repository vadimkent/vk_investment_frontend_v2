import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";
import { FormStateProvider } from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";

export function FormComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const loading = component.props.loading === true;
  const loadingClass = loading ? " opacity-50 pointer-events-none" : "";
  const classes = [shared.className, loadingClass].filter(Boolean).join(" ");
  const initial = collectInitialValues(component);

  return (
    <FormStateProvider initial={initial}>
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
    </FormStateProvider>
  );
}
