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

export function CheckboxComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = String(component.props.label);
  const checked = component.props.checked === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function handleChange(value: boolean) {
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
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="w-4 h-4 rounded border-border-input"
        data-sdui-id={component.id}
        onChange={(e) => handleChange(e.target.checked)}
      />
      <span className={disabled ? "text-content-muted" : ""}>{label}</span>
    </label>
  );
}
