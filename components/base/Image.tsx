import type { SDUIComponent } from "@/lib/types/sdui";

export function ImageComponent({ component }: { component: SDUIComponent }) {
  const width = component.props.width as string | undefined;
  const height = component.props.height as string | undefined;
  const fit = component.props.fit as string | undefined;
  const borderRadius = component.props.border_radius as string | undefined;

  const imgStyle: Record<string, string> = {};
  if (width) imgStyle.width = width;
  if (height) imgStyle.height = height;
  if (fit) imgStyle.objectFit = fit;
  if (borderRadius) {
    imgStyle.borderRadius = borderRadius === "full" ? "9999px" : borderRadius;
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
