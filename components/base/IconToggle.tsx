"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { useActionDispatcher } from "@/components/action-dispatcher";
import { useTheme } from "@/components/theme-provider";
import { useSensitive } from "@/components/sensitive-provider";
import { useSidebar } from "@/components/sidebar-provider";
import { getIcon } from "@/lib/icon-registry";
import { substitutePlaceholders } from "@/lib/url-placeholders";

const CLIENT_ACTIONS: Record<string, (ctx: ClientActionCtx) => void> = {
  toggle_theme: (ctx) => ctx.toggleTheme(),
  toggle_sensitive: (ctx) => ctx.toggleSensitive(),
  toggle_sidebar: (ctx) => ctx.toggleSidebar(),
};

type ClientActionCtx = {
  toggleTheme: () => void;
  toggleSensitive: () => void;
  toggleSidebar: () => void;
};

export function IconToggleComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const initialActive = component.props.active === true;
  const iconInactive = component.props.icon_inactive as string;
  const iconActive = component.props.icon_active as string;
  const tooltipInactive = component.props.tooltip_inactive as
    | string
    | undefined;
  const tooltipActive = component.props.tooltip_active as string | undefined;

  const [active, setActive] = useState(initialActive);
  const dispatch = useActionDispatcher();
  const { toggle: toggleTheme } = useTheme();
  const { toggleSensitive } = useSensitive();
  const { toggleSidebar } = useSidebar();

  const icon = active ? iconActive : iconInactive;
  const tooltip = active ? tooltipActive : tooltipInactive;
  const Icon = getIcon(icon);

  async function handleClick() {
    const nextActive = !active;
    const action = nextActive ? component.actions?.[0] : component.actions?.[1];
    if (!action) return;

    const clientHandler = CLIENT_ACTIONS[action.type];
    if (clientHandler) {
      setActive(nextActive);
      clientHandler({ toggleTheme, toggleSensitive, toggleSidebar });
      return;
    }

    if (!action.endpoint) return;

    setActive(nextActive);

    try {
      const endpoint = substitutePlaceholders(action.endpoint, {});
      await dispatch(endpoint, action.method ?? "GET", undefined, {
        loading: action.loading,
        targetId: action.target_id,
      });
    } catch {
      setActive(!nextActive);
    }
  }

  if (!Icon) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      className="inline-flex items-center justify-center rounded p-1.5 text-content-primary transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
