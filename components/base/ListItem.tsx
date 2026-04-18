"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";
import { useRouter } from "next/navigation";
import { stripScreens } from "@/lib/strip-screens";
import { substitutePlaceholders } from "@/lib/url-placeholders";

export function ListItemComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const shared = containerProps(component);
  const hasActions = component.actions && component.actions.length > 0;
  const clickableClass = hasActions
    ? " cursor-pointer hover:bg-surface-secondary"
    : "";
  const classes = [
    "border-b border-border py-3 px-4",
    shared.className,
    clickableClass,
  ]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    if (!hasActions) return;
    const action = component.actions![0];
    if (action.type === "navigate" && action.url) {
      const url = substitutePlaceholders(action.url, {});
      if (action.target === "blank") {
        window.open(url, "_blank");
      } else {
        router.push(stripScreens(url));
      }
    }
  }

  const styleObj = Object.keys(shared.style).length ? shared.style : undefined;

  return (
    <div
      className={classes}
      style={styleObj}
      onClick={hasActions ? handleClick : undefined}
      role={hasActions ? "button" : undefined}
      tabIndex={hasActions ? 0 : undefined}
    >
      {component.children?.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
    </div>
  );
}
