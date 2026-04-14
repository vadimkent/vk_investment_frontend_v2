import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";

export function BadgeComponent({ component }: { component: SDUIComponent }) {
  const count = component.props.count as number | undefined;
  const variant = (component.props.variant as string) ?? "error";
  const child = component.children?.[0];

  const variantStyles: Record<string, string> = {
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    success: "bg-green-500",
  };

  const bgClass = variantStyles[variant] ?? variantStyles.error;
  const hasCount = count != null && count > 0;
  const displayText = hasCount ? (count > 99 ? "99+" : String(count)) : "";

  return (
    <div className="relative inline-block">
      {child && <ComponentRenderer component={child} />}
      <span
        className={`absolute -top-1 -right-1 ${bgClass} text-white text-xs rounded-full flex items-center justify-center ${hasCount ? "min-w-[1.25rem] h-5 px-1" : "w-2.5 h-2.5"}`}
      >
        {displayText}
      </span>
    </div>
  );
}
