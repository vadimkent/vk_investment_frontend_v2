"use client";

import type { ReactNode } from "react";
import { useOverrideMap } from "@/components/override-map-context";
import { RawRenderer } from "@/components/renderer";

export function OverrideBoundary({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { getOverride } = useOverrideMap();
  const override = getOverride(id);
  if (override) return <RawRenderer component={override} />;
  return <>{children}</>;
}
