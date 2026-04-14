import type { SDUIComponent } from "@/lib/types/sdui";
import { objectFitSet, radiusMap } from "@/lib/sdui-utils";

export function ImageComponent({ component }: { component: SDUIComponent }) {
  const width = component.props.width as string | undefined;
  const height = component.props.height as string | undefined;
  const fit = component.props.fit as string | undefined;
  const borderRadius = component.props.border_radius as string | undefined;

  const imgStyle: Record<string, string> = {};
  if (width) imgStyle.width = width;
  if (height) imgStyle.height = height;
  if (fit && objectFitSet.has(fit)) imgStyle.objectFit = fit;
  if (borderRadius && radiusMap[borderRadius]) {
    imgStyle.borderRadius = radiusMap[borderRadius];
  }

  const hasStyle = Object.keys(imgStyle).length > 0;

  return (
    <img
      src={String(component.props.src)}
      alt={String(component.props.alt)}
      className="max-w-full"
      style={hasStyle ? imgStyle : undefined}
    />
  );
}
