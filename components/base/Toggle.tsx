"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";

export function ToggleComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = String(component.props.label);
  const defaultChecked = component.props.checked === true;
  const disabled = component.props.disabled === true;
  const [on, setOn] = useState(defaultChecked);

  function handleToggle() {
    if (disabled) return;
    setOn(!on);
  }

  const trackClass = on ? "bg-blue-600" : "bg-gray-300";
  const thumbPos = on ? "translate-x-5" : "translate-x-0";
  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed"
    : " cursor-pointer";

  return (
    <label className={`flex items-center gap-3${disabledClass}`}>
      <input
        type="hidden"
        name={name}
        value={String(on)}
        data-sdui-id={component.id}
      />
      <button
        type="button"
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${trackClass}`}
        disabled={disabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${thumbPos}`}
        />
      </button>
      <span className={disabled ? "text-gray-400" : ""}>{label}</span>
    </label>
  );
}
