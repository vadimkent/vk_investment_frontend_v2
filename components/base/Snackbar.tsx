"use client";

import { useEffect, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";

export function SnackbarComponent({ component }: { component: SDUIComponent }) {
  const [visible, setVisible] = useState(true);
  const message = String(component.props.message);
  const variant = String(component.props.variant ?? "info");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const variantStyles: Record<string, string> = {
    success: "bg-status-success",
    error: "bg-status-error",
    info: "bg-accent-primary",
    warning: "bg-status-warning",
  };

  const bg = variantStyles[variant] ?? variantStyles.info;

  return (
    <div
      className={`fixed bottom-4 right-4 ${bg} text-content-on-accent px-4 py-3 rounded shadow-lg z-50`}
    >
      {message}
    </div>
  );
}
