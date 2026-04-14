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
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
    warning: "bg-yellow-600",
  };

  const bg = variantStyles[variant] ?? variantStyles.info;

  return (
    <div
      className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-3 rounded shadow-lg z-50`}
    >
      {message}
    </div>
  );
}
