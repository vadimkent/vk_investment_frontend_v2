"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { useActionDispatcher } from "@/components/action-dispatcher";
import { getIcon } from "@/lib/icon-registry";

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

  const icon = active ? iconActive : iconInactive;
  const tooltip = active ? tooltipActive : tooltipInactive;
  const Icon = getIcon(icon);

  async function handleClick() {
    const nextActive = !active;
    const action = nextActive ? component.actions?.[0] : component.actions?.[1];
    if (!action?.endpoint) return;

    setActive(nextActive);

    try {
      await dispatch(action.endpoint, action.method ?? "GET", undefined, {
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
      className={`inline-flex items-center justify-center rounded p-1.5 transition-colors ${
        active
          ? "text-accent-primary"
          : "text-content-muted hover:text-content-primary"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
