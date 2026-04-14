"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
export function ButtonComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();

  async function sendAction(
    endpoint: string,
    method: string,
    data?: Record<string, string>,
  ): Promise<{ action: string; target_id?: string }> {
    const response = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, method, data }),
    });
    return response.json();
  }
  const label = component.props.label as string | undefined;
  const imageSrc = component.props.image_src as string | undefined;
  const btnVariant = (component.props.variant as string) ?? "primary";
  const btnStyle = (component.props.style as string) ?? "solid";
  const disabled = component.props.disabled === true;
  const loading = component.props.loading === true;
  const isDisabled = disabled || loading;

  function collectFormData(targetId: string): Record<string, string> {
    const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
    if (!container) return {};
    const data: Record<string, string> = {};
    const inputs = container.querySelectorAll<HTMLInputElement>("input[name]");
    inputs.forEach((input) => {
      if (input.type === "checkbox") {
        data[input.name] = String(input.checked);
      } else {
        data[input.name] = input.value;
      }
    });
    const selects =
      container.querySelectorAll<HTMLSelectElement>("select[name]");
    selects.forEach((select) => {
      data[select.name] = select.value;
    });
    const textareas =
      container.querySelectorAll<HTMLTextAreaElement>("textarea[name]");
    textareas.forEach((textarea) => {
      data[textarea.name] = textarea.value;
    });
    return data;
  }

  async function handleActionResponse(res: {
    action: string;
    target_id?: string;
  }) {
    switch (res.action) {
      case "navigate":
        if (res.target_id) router.push(res.target_id);
        break;
      case "refresh":
        router.refresh();
        break;
    }
  }

  async function handleClick() {
    if (isDisabled) return;

    const action = component.actions?.[0];
    if (!action) return;

    switch (action.type) {
      case "navigate":
        if (action.url) {
          if (action.target === "blank") {
            window.open(action.url, "_blank");
          } else {
            router.push(action.url);
          }
        }
        break;
      case "navigate_back":
        router.back();
        break;
      case "submit":
        if (action.endpoint) {
          const data = action.target_id
            ? collectFormData(action.target_id)
            : {};
          const res = await sendAction(
            action.endpoint,
            action.method ?? "POST",
            data,
          );
          await handleActionResponse(res);
        }
        break;
      case "reload":
        if (action.endpoint) {
          const res = await sendAction(action.endpoint, "GET");
          await handleActionResponse(res);
        }
        break;
      case "refresh":
        router.refresh();
        break;
      case "open_url":
        if (action.url) window.open(action.url, "_blank");
        break;
      case "dismiss":
        break;
      case "logout":
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        break;
    }
  }

  const variantStyles: Record<string, Record<string, string>> = {
    primary: {
      solid: "bg-blue-600 text-white",
      ghost: "text-blue-600",
      outline: "border border-blue-600 text-blue-600",
    },
    secondary: {
      solid: "bg-gray-200 text-gray-800",
      ghost: "text-gray-600",
      outline: "border border-gray-400 text-gray-600",
    },
  };

  const classes =
    variantStyles[btnVariant]?.[btnStyle] ?? variantStyles.primary.solid;
  const disabledClass = isDisabled ? " opacity-50 cursor-not-allowed" : "";

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`px-4 py-2 rounded flex items-center gap-2 ${classes}${disabledClass}`}
    >
      {loading && (
        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {imageSrc && !loading && (
        <img src={imageSrc} alt="" className="w-5 h-5" />
      )}
      {label && <span>{loading ? "Loading..." : label}</span>}
    </button>
  );
}
