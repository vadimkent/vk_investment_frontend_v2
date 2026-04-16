import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps, radiusMap } from "@/lib/sdui-utils";

export function CardComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const elevation = component.props.elevation as string | undefined;
  const borderRadius = component.props.border_radius as string | undefined;

  const elevationStyles: Record<string, string> = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  };

  const shadowClass = elevation
    ? (elevationStyles[elevation] ?? "shadow-sm")
    : "shadow-sm";
  const classes = ["border border-border rounded-lg p-4", shadowClass, shared.className]
    .filter(Boolean)
    .join(" ");

  const cardStyle: Record<string, string> = {};
  if (borderRadius && radiusMap[borderRadius]) {
    cardStyle.borderRadius = radiusMap[borderRadius];
  }
  const mergedStyle = Object.assign({}, shared.style, cardStyle);
  const hasStyle = Object.keys(mergedStyle).length > 0;

  return (
    <div className={classes} style={hasStyle ? mergedStyle : undefined}>
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
