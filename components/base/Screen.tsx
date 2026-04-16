"use client";

import { useEffect } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useRouter } from "next/navigation";

export function ScreenComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const title = component.props.title as string | undefined;
  const subtitle = component.props.subtitle as string | undefined;
  const icon = component.props.icon as string | undefined;
  const hasBackAction = component.props.back_action === true;

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  function handleBack() {
    const action = component.actions?.[0];
    if (action && action.type === "navigate_back") {
      router.back();
    } else if (action && action.type === "navigate" && action.url) {
      router.push(action.url);
    } else {
      router.back();
    }
  }

  const hasHeader = hasBackAction || icon || subtitle;

  return (
    <div className="min-h-screen flex flex-col">
      {hasHeader && (
        <div className="p-4">
          <div className="flex items-center gap-3">
            {hasBackAction && (
              <button
                onClick={handleBack}
                className="text-content-secondary hover:text-content-primary"
              >
                <span className="text-xl">&larr;</span>
              </button>
            )}
            {icon && <span className="text-2xl">{icon}</span>}
            {subtitle && <p className="text-sm text-content-muted">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col [&>*:only-child]:flex-1">
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}
