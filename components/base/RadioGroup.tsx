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
    <fieldset data-sdui-id={component.id}>
      {label && (
        <legend className="text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
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
            <span className={disabled ? "text-gray-400" : ""}>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
