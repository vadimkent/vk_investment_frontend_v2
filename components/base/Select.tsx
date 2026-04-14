"use client";

import type { SDUIComponent } from "@/lib/types/sdui";

interface Option {
  value: string;
  label: string;
}

export function SelectComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const placeholder = component.props.placeholder as string | undefined;
  const options = (component.props.options as Option[]) ?? [];
  const defaultValue = component.props.default_value as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed bg-gray-100"
    : "";

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className={`border rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
