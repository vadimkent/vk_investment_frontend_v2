import type { SDUIComponent } from "@/lib/types/sdui";
import { getComponent } from "@/components/registry";
import { selfProps } from "@/lib/sdui-utils";
import { OverrideBoundary } from "@/components/override-boundary";
import { SensitiveMask } from "@/components/sensitive-mask";

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
  const isSensitive = component.props.sensitive === true;
  const inner = <RawRenderer component={component} />;
  const content = isSensitive ? <SensitiveMask>{inner}</SensitiveMask> : inner;
  return <OverrideBoundary id={component.id}>{content}</OverrideBoundary>;
}
