"use client";

import type { ReactNode } from "react";
import { useSensitive } from "@/components/sensitive-provider";

export function SensitiveMask({ children }: { children: ReactNode }) {
  const { hideValues } = useSensitive();
  if (hideValues) return <span className="select-none">••••</span>;
  return <>{children}</>;
}
