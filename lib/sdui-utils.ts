import type { SDUIComponent } from "@/lib/types/sdui";

const alignItemsMap: Record<string, string> = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
  stretch: "items-stretch",
};

const justifyItemsMap: Record<string, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
  stretch: "justify-stretch",
};

const alignSelfMap: Record<string, string> = {
  left: "self-start",
  center: "self-center",
  right: "self-end",
};

const justifySelfMap: Record<string, string> = {
  top: "justify-self-start",
  center: "justify-self-center",
  bottom: "justify-self-end",
};

const positionMap: Record<string, string> = {
  fixed: "fixed",
  absolute: "absolute",
};

export const gapMap: Record<string, string> = {
  none: "0",
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
};

export const radiusMap: Record<string, string> = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

export const objectFitSet = new Set([
  "cover",
  "contain",
  "fill",
  "none",
  "scale-down",
]);

/**
 * Extract container-level shared props (alignment, gap) as Tailwind classes and inline styles.
 * Use on components that render children.
 */
export function containerProps(component: SDUIComponent): {
  className: string;
  style: Record<string, string>;
} {
  const classes: string[] = [];
  const style: Record<string, string> = {};

  const alignItems = component.props.align_items as string | undefined;
  if (alignItems && alignItemsMap[alignItems]) {
    classes.push(alignItemsMap[alignItems]);
  }

  const justifyItems = component.props.justify_items as string | undefined;
  if (justifyItems && justifyItemsMap[justifyItems]) {
    classes.push(justifyItemsMap[justifyItems]);
  }

  const gap = component.props.gap as string | undefined;
  if (gap && gapMap[gap]) {
    style.gap = gapMap[gap];
  }

  return { className: classes.join(" "), style };
}

/**
 * Extract self-level shared props (self alignment, position) as Tailwind classes.
 * Use on any component to apply self-alignment and positioning.
 */
export function selfProps(component: SDUIComponent): string {
  const classes: string[] = [];

  const alignSelf = component.props.align_self as string | undefined;
  if (alignSelf && alignSelfMap[alignSelf]) {
    classes.push(alignSelfMap[alignSelf]);
  }

  const justifySelf = component.props.justify_self as string | undefined;
  if (justifySelf && justifySelfMap[justifySelf]) {
    classes.push(justifySelfMap[justifySelf]);
  }

  const position = component.props.position as string | undefined;
  if (position && positionMap[position]) {
    classes.push(positionMap[position]);
  }

  return classes.join(" ");
}
