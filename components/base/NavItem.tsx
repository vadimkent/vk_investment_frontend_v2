"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";

export function NavItemComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const badgeCount = component.props.badge_count as number | undefined;

  const handleClick = () => {
    const action = component.actions?.[0];
    if (!action) return;

    if (action.type === "navigate" && action.url) {
      router.push(action.url);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-left hover:bg-surface-secondary relative"
    >
      {component.props.icon != null && (
        <span className="text-content-muted relative">
          {String(component.props.icon)}
          {badgeCount != null && badgeCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-status-error text-content-on-accent text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </span>
      )}
      <span>{String(component.props.label)}</span>
    </button>
  );
}
