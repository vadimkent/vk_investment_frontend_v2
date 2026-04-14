"use client";

import { useShellChildren } from "@/components/shell-children-context";

export function ContentSlotComponent() {
  const slot = useShellChildren();
  return <div className="flex-1">{slot}</div>;
}
