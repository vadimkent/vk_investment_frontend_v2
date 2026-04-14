"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useRouter } from "next/navigation";

export function ScreenComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const subtitle = component.props.subtitle as string | undefined;
  const icon = component.props.icon as string | undefined;
  const hasBackAction = component.props.back_action === true;

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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {hasBackAction && (
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">&larr;</span>
            </button>
          )}
          {icon && <span className="text-2xl">{icon}</span>}
          <div>
            {component.props.title != null && (
              <h1 className="text-2xl font-bold">
                {String(component.props.title)}
              </h1>
            )}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}
