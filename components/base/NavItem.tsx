"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
import { getIcon } from "@/lib/icon-registry";
import { stripScreens } from "@/lib/strip-screens";
import { useSidebar } from "@/components/sidebar-provider";

export function NavItemComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const { collapsed } = useSidebar();
  const badgeCount = component.props.badge_count as number | undefined;
  const iconName = component.props.icon as string | undefined;
  const label = String(component.props.label);
  const Icon = iconName ? getIcon(iconName) : null;

  const handleClick = () => {
    const action = component.actions?.[0];
    if (!action) return;

    if (action.type === "navigate" && action.url) {
      router.push(stripScreens(action.url));
    }
  };

  return (
    <button
      onClick={handleClick}
      title={collapsed ? label : undefined}
      className={`flex items-center w-full px-3 py-2 rounded-md hover:bg-surface-secondary relative ${
        collapsed ? "justify-center" : "gap-3 text-left"
      }`}
    >
      {iconName != null && (
        <span className="text-content-muted relative">
          {Icon ? <Icon className="w-4 h-4" /> : String(iconName)}
          {badgeCount != null && badgeCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-status-error text-content-on-accent text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </span>
      )}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
