"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
import {
  collectFormData,
  useActionDispatcher,
} from "@/components/action-dispatcher";

export function ButtonComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const dispatch = useActionDispatcher();

  const label = component.props.label as string | undefined;
  const imageSrc = component.props.image_src as string | undefined;
  const btnVariant = (component.props.variant as string) ?? "primary";
  const btnStyle = (component.props.style as string) ?? "solid";
  const disabled = component.props.disabled === true;
  const loading = component.props.loading === true;
  const isDisabled = disabled || loading;

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
          await dispatch(action.endpoint, action.method ?? "POST", data);
        }
        break;
      case "reload":
        if (action.endpoint) await dispatch(action.endpoint, "GET");
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

  const btnSize = (component.props.size as string) ?? "md";
  const sizeStyles: Record<string, string> = {
    xs: "text-xs px-2 py-1",
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-5 py-3",
  };
  const sizeClass = sizeStyles[btnSize] ?? sizeStyles.md;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${sizeClass} rounded flex items-center gap-2 ${classes}${disabledClass}`}
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
