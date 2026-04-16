"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  useActionDispatcher,
} from "@/components/action-dispatcher";

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
    ? " opacity-50 cursor-not-allowed bg-surface-muted"
    : "";

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  function handleChange(value: string) {
    if (!changeAction?.endpoint) return;
    const data = changeAction.target_id
      ? collectFormData(changeAction.target_id)
      : { [name]: value };
    dispatch(changeAction.endpoint, changeAction.method ?? "POST", data);
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className={`border border-border-input rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
        onChange={(e) => handleChange(e.target.value)}
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
