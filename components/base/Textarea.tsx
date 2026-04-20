"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

export function TextareaComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const placeholder = component.props.placeholder as string | undefined;
  const defaultValue = component.props.default_value as string | undefined;
  const rows = (component.props.rows as number) ?? 3;
  const maxLength = component.props.max_length as number | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  const [invalid, setInvalid] = useState(false);

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function runChecks(el: HTMLTextAreaElement) {
    setInvalid(!el.validity.valid);
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
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
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
