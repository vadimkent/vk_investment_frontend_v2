"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  useActionDispatcher,
} from "@/components/action-dispatcher";

export function CheckboxComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = String(component.props.label);
  const checked = component.props.checked === true;
  const disabled = component.props.disabled === true;

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  function handleChange(value: boolean) {
    if (!changeAction?.endpoint) return;
    const data = changeAction.target_id
      ? collectFormData(changeAction.target_id)
      : { [name]: value };
    dispatch(changeAction.endpoint, changeAction.method ?? "POST", data);
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300"
        data-sdui-id={component.id}
        onChange={(e) => handleChange(e.target.checked)}
      />
      <span className={disabled ? "text-gray-400" : ""}>{label}</span>
    </label>
  );
}
