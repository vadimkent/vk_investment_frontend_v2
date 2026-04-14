"use client";

import type { SDUIComponent } from "@/lib/types/sdui";

export function CheckboxComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = String(component.props.label);
  const checked = component.props.checked === true;
  const disabled = component.props.disabled === true;

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300"
        data-sdui-id={component.id}
      />
      <span className={disabled ? "text-gray-400" : ""}>{label}</span>
    </label>
  );
}
