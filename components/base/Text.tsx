import type { SDUIComponent } from "@/lib/types/sdui";
import { selfProps } from "@/lib/sdui-utils";

const sizeStyles: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const weightStyles: Record<string, string> = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  bold: "font-bold",
};

const colorStyles: Record<string, string> = {
  primary: "text-gray-900",
  secondary: "text-gray-600",
  muted: "text-gray-400",
  error: "text-red-600",
  positive: "text-green-600",
  negative: "text-red-600",
};

const decorationStyles: Record<string, string> = {
  underline: "underline",
  strikethrough: "line-through",
  none: "no-underline",
};

export function TextComponent({ component }: { component: SDUIComponent }) {
  const content = String(component.props.content);
  const size = String(component.props.size ?? "md");
  const weight = String(component.props.weight ?? "normal");
  const display = String(component.props.display ?? "block");
  const color = component.props.color as string | undefined;
  const hexColor = component.props.hex_color as string | undefined;
  const decoration = component.props.decoration as string | undefined;

  const classes = [
    sizeStyles[size] ?? sizeStyles.md,
    weightStyles[weight] ?? weightStyles.normal,
    !hexColor && color ? (colorStyles[color] ?? "") : "",
    decoration ? (decorationStyles[decoration] ?? "") : "",
    selfProps(component),
  ]
    .filter(Boolean)
    .join(" ");

  const style = hexColor ? { color: hexColor } : undefined;

  if (display === "inline") {
    return (
      <span className={classes} style={style}>
        {content}
      </span>
    );
  }

  return (
    <p className={classes} style={style}>
      {content}
    </p>
  );
}
