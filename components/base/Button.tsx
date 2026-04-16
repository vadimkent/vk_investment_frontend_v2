"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
import {
  collectFormData,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import { useTheme } from "@/components/theme-provider";
import { getIcon } from "@/lib/icon-registry";

export function ButtonComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const dispatch = useActionDispatcher();
  const { toggle } = useTheme();

  const label = component.props.label as string | undefined;
  const imageSrc = component.props.image_src as string | undefined;
  const iconName = component.props.icon as string | undefined;
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
      case "toggle_theme":
        toggle();
        break;
    }
  }

  const variantStyles: Record<string, Record<string, string>> = {
    primary: {
      solid: "bg-accent-primary text-content-on-accent",
      ghost: "text-accent-primary",
      outline: "border border-accent-primary text-accent-primary",
    },
    secondary: {
      solid: "bg-surface-muted text-content-primary",
      ghost: "text-content-secondary",
      outline: "border border-border-input text-content-secondary",
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
      {!loading &&
        iconName &&
        (() => {
          const Icon = getIcon(iconName);
          return Icon ? <Icon className="w-4 h-4" /> : null;
        })()}
      {!loading && !iconName && imageSrc && (
        <img src={imageSrc} alt="" className="w-5 h-5" />
      )}
      {label && <span>{loading ? "Loading..." : label}</span>}
    </button>
  );
}
