import type { SDUIComponent } from "@/lib/types/sdui";
import { getComponent } from "@/components/registry";
import { selfProps } from "@/lib/sdui-utils";
import { OverrideBoundary } from "@/components/override-boundary";

interface Props {
  component: SDUIComponent;
}

export function RawRenderer({ component }: Props) {
  const Component = getComponent(component.type);
  if (!Component) return null;

  const selfClasses = selfProps(component);
  if (!selfClasses) return <Component component={component} />;
  return (
    <div className={selfClasses}>
      <Component component={component} />
    </div>
  );
}

export function ComponentRenderer({ component }: Props) {
  return (
    <OverrideBoundary id={component.id}>
      <RawRenderer component={component} />
    </OverrideBoundary>
  );
}
