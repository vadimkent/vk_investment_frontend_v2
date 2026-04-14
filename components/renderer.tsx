import type { SDUIComponent } from "@/lib/types/sdui";
import { getComponent } from "@/components/registry";
import { selfProps } from "@/lib/sdui-utils";

interface Props {
  component: SDUIComponent;
}

export function ComponentRenderer({ component }: Props) {
  const Component = getComponent(component.type);

  if (!Component) {
    return null;
  }

  const selfClasses = selfProps(component);

  if (!selfClasses) {
    return <Component component={component} />;
  }

  return (
    <div className={selfClasses}>
      <Component component={component} />
    </div>
  );
}
