"use client";

import type { ReactNode } from "react";
import { useOverrideMap } from "@/components/override-map-context";
import { RawRenderer } from "@/components/renderer";

function SectionLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-primary/60 rounded">
      <div className="animate-spin h-5 w-5 border-2 border-accent-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function OverrideBoundary({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { getOverride, isLoading } = useOverrideMap();
  const override = getOverride(id);
  const loading = isLoading(id);

  const content = override ? <RawRenderer component={override} /> : children;

  if (loading) {
    return (
      <div className="relative">
        {content}
        <SectionLoadingOverlay />
      </div>
    );
  }

  return <>{content}</>;
}
