"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import { substitutePlaceholders } from "@/lib/url-placeholders";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

interface Option {
  value: string;
  label: string;
}

export function SelectComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const placeholderProp = component.props.placeholder as string | undefined;
  const rawOptions = (component.props.options as Option[]) ?? [];
  const emptyOption = rawOptions.find((o) => o.value === "");
  const options = rawOptions.filter((o) => o.value !== "");
  const placeholder = placeholderProp ?? emptyOption?.label;
  const defaultValue = component.props.default_value as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function handleChange(next: string) {
    setValue(next);
    formCtx?.setValue(name, next);
    if (!changeAction?.endpoint) return;
    const placeholders = { value: next };
    const endpoint = substitutePlaceholders(
      changeAction.endpoint,
      placeholders,
    );
    if (changeAction.target_id && hasInvalidFields(changeAction.target_id))
      return;

    switch (changeAction.type) {
      case "reload":
        dispatch(endpoint, "GET", undefined, {
          loading: changeAction.loading,
          targetId: changeAction.target_id,
        });
        break;
      case "submit":
        dispatch(
          endpoint,
          changeAction.method ?? "POST",
          changeAction.target_id
            ? { ...collectFormData(changeAction.target_id), [name]: next }
            : { [name]: next },
          {
            loading: changeAction.loading,
            targetId: changeAction.target_id,
          },
        );
        break;
    }
  }

  return (
    <div data-sdui-id={component.id}>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={value} />
      <SelectPrimitive.Root
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
        required={required}
      >
        <div className="flex items-center gap-1">
          <SelectPrimitive.Trigger
            className={`flex flex-1 min-w-0 items-center justify-between gap-2 rounded border border-border-input bg-transparent px-3 py-2 text-sm text-content-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary/40 data-[placeholder]:text-content-muted ${
              disabled ? "opacity-50 cursor-not-allowed bg-surface-muted" : ""
            }`}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="size-4 opacity-60" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          {value && !disabled && (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={() => handleChange("")}
              className="inline-flex items-center justify-center rounded p-1.5 text-content-muted hover:text-content-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-(--radix-select-content-available-height) min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-border bg-surface-card text-content-primary shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-content-secondary">
              <ChevronUp className="size-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm text-content-primary outline-none data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemText>
                    {opt.label}
                  </SelectPrimitive.ItemText>
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-content-secondary">
              <ChevronDown className="size-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
