"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import { useTheme } from "@/components/theme-provider";
import { useSensitive } from "@/components/sensitive-provider";
import { useSidebar } from "@/components/sidebar-provider";
import { getIcon } from "@/lib/icon-registry";
import { stripScreens } from "@/lib/strip-screens";
import { substitutePlaceholders } from "@/lib/url-placeholders";

export function ButtonComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const dispatch = useActionDispatcher();
  const { toggle } = useTheme();
  const { toggleSensitive } = useSensitive();
  const { toggleSidebar } = useSidebar();

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

    const placeholders: Record<string, string> = {};

    switch (action.type) {
      case "navigate":
        if (action.url) {
          const url = substitutePlaceholders(action.url, placeholders);
          if (action.target === "blank") {
            window.open(url, "_blank");
          } else {
            router.push(stripScreens(url));
          }
        }
        break;
      case "navigate_back":
        router.back();
        break;
      case "submit":
        if (action.endpoint) {
          if (action.target_id && hasInvalidFields(action.target_id)) {
            const container = document.querySelector(
              `[data-sdui-id="${action.target_id}"]`,
            );
            container
              ?.querySelector<HTMLElement>('[data-sdui-invalid="true"]')
              ?.focus();
            break;
          }
          const data = action.target_id
            ? collectFormData(action.target_id)
            : {};
          const endpoint = substitutePlaceholders(
            action.endpoint,
            placeholders,
          );
          await dispatch(endpoint, action.method ?? "POST", data, {
            loading: action.loading,
            targetId: action.target_id,
          });
        }
        break;
      case "reload":
        if (action.endpoint) {
          const endpoint = substitutePlaceholders(
            action.endpoint,
            placeholders,
          );
          await dispatch(endpoint, "GET", undefined, {
            loading: action.loading,
            targetId: action.target_id,
          });
        }
        break;
      case "refresh":
        router.refresh();
        break;
      case "open_url":
        if (action.url) {
          const url = substitutePlaceholders(action.url, placeholders);
          window.open(url, "_blank");
        }
        break;
      case "dismiss":
        break;
      case "logout":
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
        break;
      case "toggle_theme":
        toggle();
        break;
      case "toggle_sensitive":
        toggleSensitive();
        break;
      case "toggle_sidebar":
        toggleSidebar();
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
  const iconOnlySizeStyles: Record<string, string> = {
    xs: "text-xs p-1",
    sm: "text-sm p-1.5",
    md: "text-base p-2",
    lg: "text-lg p-2.5",
  };
  const iconOnly = !label;
  const sizeClass = iconOnly
    ? (iconOnlySizeStyles[btnSize] ?? iconOnlySizeStyles.md)
    : (sizeStyles[btnSize] ?? sizeStyles.md);
  const layoutClass = iconOnly ? "inline-flex justify-center" : "flex";

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${sizeClass} rounded ${layoutClass} items-center gap-2 ${classes}${disabledClass}`}
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
