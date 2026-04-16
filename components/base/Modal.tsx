"use client";

import { useEffect, useCallback } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";

export function ModalComponent({ component }: { component: SDUIComponent }) {
  const visible = component.props.visible === true;
  const title = component.props.title as string | undefined;
  const dismissible = component.props.dismissible !== false;
  const presentation = (component.props.presentation as string) ?? "dialog";

  const handleBackdropClick = useCallback(() => {
    if (dismissible) {
      // Dismiss action handled by parent
    }
  }, [dismissible]);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  const presentationClasses: Record<string, string> = {
    dialog: "items-center justify-center",
    bottom_sheet: "items-end",
    fullscreen: "items-stretch",
  };

  const contentClasses: Record<string, string> = {
    dialog: "rounded-lg max-w-lg w-full max-h-[80vh]",
    bottom_sheet: "rounded-t-lg w-full max-h-[80vh]",
    fullscreen: "w-full h-full",
  };

  const containerClass =
    presentationClasses[presentation] ?? presentationClasses.dialog;
  const panelClass = contentClasses[presentation] ?? contentClasses.dialog;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${containerClass}`}
      onClick={dismissible ? handleBackdropClick : undefined}
    >
      <div className="absolute inset-0 bg-overlay/50" />
      <div
        className={`relative bg-surface-primary overflow-y-auto ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
        )}
        <div className="p-4">
          {component.children?.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
