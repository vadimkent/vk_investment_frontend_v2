"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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
  const minLength = component.props.min_length as number | undefined;
  const pattern = component.props.pattern as string | undefined;
  const autoUppercase = component.props.auto_uppercase === true;
  const matchField = component.props.match_field as string | undefined;
  const requiredMessage = component.props.required_message as
    | string
    | undefined;
  const patternMessage = component.props.pattern_message as string | undefined;
  const minLengthMessage = component.props.min_length_message as
    | string
    | undefined;
  const maxLengthMessage = component.props.max_length_message as
    | string
    | undefined;
  const matchFieldMessage = component.props.match_field_message as
    | string
    | undefined;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  type FailureKey =
    | "required"
    | "match_field"
    | "pattern"
    | "min_length"
    | "max_length";

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  const matchValue = useFieldValue(matchField ?? "");
  const [failure, setFailure] = useState<FailureKey | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const invalid = failure !== null;

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

  function computeFailure(el: HTMLInputElement): FailureKey | null {
    if (required && el.value === "") return "required";
    if (matchField && String(matchValue ?? "") !== el.value)
      return "match_field";
    if (regex && el.value !== "" && !regex.test(el.value)) return "pattern";
    if (minLength != null && el.value !== "" && el.value.length < minLength)
      return "min_length";
    if (maxLength != null && el.value.length > maxLength) return "max_length";
    if (!el.validity.valid) return "pattern";
    return null;
  }

  function runChecks(el: HTMLInputElement) {
    if (autoUppercase) {
      const upper = el.value.toUpperCase();
      if (el.value !== upper) el.value = upper;
    }
    setFailure(computeFailure(el));
    formCtx?.setValue(name, el.value);
  }

  function handleInteraction(el: HTMLInputElement) {
    if (!touched) setTouched(true);
    runChecks(el);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;
    const formEl = e.currentTarget.closest('[data-sdui-form="true"]');
    if (!formEl) return;
    const submitBtn = formEl.querySelector<HTMLButtonElement>(
      '[data-sdui-submit="true"]:not([disabled])',
    );
    if (!submitBtn) return;
    e.preventDefault();
    submitBtn.click();
  }

  useEffect(() => {
    if (matchField && touched && inputRef.current) {
      runChecks(inputRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchValue, touched]);

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed bg-surface-muted"
    : "";
  const borderClass = invalid
    ? "border-status-error focus-visible:ring-status-error/40"
    : "border-border-input";

  let message: string | undefined;
  switch (failure) {
    case "required":
      message = requiredMessage;
      break;
    case "match_field":
      message = matchFieldMessage;
      break;
    case "pattern":
      message = patternMessage;
      break;
    case "min_length":
      message = minLengthMessage?.replace("{min}", String(minLength ?? ""));
      break;
    case "max_length":
      message = maxLengthMessage?.replace("{max}", String(maxLength ?? ""));
      break;
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        name={name}
        type={inputType}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        minLength={minLength}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        data-sdui-invalid={invalid ? "true" : undefined}
        onInput={(e) => handleInteraction(e.currentTarget)}
        onBlur={(e) => handleInteraction(e.currentTarget)}
        onKeyDown={handleKeyDown}
        className={`bg-transparent text-sm text-content-primary placeholder:text-content-muted border ${borderClass} rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      />
      {message && <p className="mt-1 text-xs text-status-error">{message}</p>}
    </div>
  );
}
