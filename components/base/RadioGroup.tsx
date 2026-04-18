"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
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

export function RadioGroupComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const options = (component.props.options as Option[]) ?? [];
  const defaultValue = component.props.default_value as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function handleChange(value: string) {
    formCtx?.setValue(name, value);
    if (!changeAction?.endpoint) return;
    if (changeAction.target_id && hasInvalidFields(changeAction.target_id))
      return;
    const data = changeAction.target_id
      ? collectFormData(changeAction.target_id)
      : { [name]: value };
    dispatch(changeAction.endpoint, changeAction.method ?? "POST", data, {
      loading: changeAction.loading,
      targetId: changeAction.target_id,
    });
  }

  return (
    <fieldset data-sdui-id={component.id}>
      {label && (
        <legend className="text-sm font-medium text-content-secondary mb-2">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </legend>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={opt.value === defaultValue}
              disabled={disabled}
              required={required}
              className="w-4 h-4"
              onChange={(e) => handleChange(e.target.value)}
            />
            <span className={disabled ? "text-content-muted" : ""}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
