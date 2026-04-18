"use client";

import { useMemo, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

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
  const pattern = component.props.pattern as string | undefined;
  const autoUppercase = component.props.auto_uppercase === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  const [invalid, setInvalid] = useState(false);

  const regex = useMemo(() => {
    if (!pattern) return null;
    try {
      return new RegExp(pattern);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Invalid pattern for input ${component.id}: ${pattern}`);
      }
      return null;
    }
  }, [pattern, component.id]);

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function runChecks(el: HTMLInputElement) {
    if (autoUppercase) {
      const upper = el.value.toUpperCase();
      if (el.value !== upper) el.value = upper;
    }
    if (regex) {
      const v = el.value;
      setInvalid(v !== "" && !regex.test(v));
    }
    formCtx?.setValue(name, el.value);
  }

  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed bg-surface-muted"
    : "";
  const borderClass = invalid
    ? "border-status-error focus-visible:ring-status-error/40"
    : "border-border-input";

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
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
        aria-invalid={invalid || undefined}
        data-sdui-invalid={invalid ? "true" : undefined}
        onInput={(e) => runChecks(e.currentTarget)}
        onBlur={(e) => runChecks(e.currentTarget)}
        className={`bg-transparent text-content-primary placeholder:text-content-muted border ${borderClass} rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      />
    </div>
  );
}
