"use client";

import type { SDUIComponent } from "@/lib/types/sdui";

export function InputComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const inputType = String(component.props.input_type ?? "text");
  const placeholder = component.props.placeholder
    ? String(component.props.placeholder)
    : undefined;
  const label = component.props.label as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const defaultValue = component.props.default_value as string | undefined;
  const maxLength = component.props.max_length as number | undefined;
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
      <input
        name={name}
        type={inputType}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        className={`border rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      />
    </div>
  );
}
