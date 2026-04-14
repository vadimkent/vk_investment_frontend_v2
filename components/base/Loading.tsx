import type { SDUIComponent } from "@/lib/types/sdui";

export function LoadingComponent({ component }: { component: SDUIComponent }) {
  const size = (component.props.size as string) ?? "md";
  const variant = (component.props.variant as string) ?? "spinner";

  const sizeStyles: Record<string, string> = {
    sm: "text-sm h-4",
    md: "text-base h-8",
    lg: "text-lg h-12",
  };

  const sizeClass = sizeStyles[size] ?? sizeStyles.md;

  if (variant === "skeleton") {
    return (
      <div
        className={`animate-pulse bg-gray-200 rounded w-full ${sizeClass}`}
      />
    );
  }

  return (
    <div className={`animate-pulse text-gray-400 ${sizeClass}`}>Loading...</div>
  );
}
