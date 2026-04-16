"use client";

import { useOverrideMap } from "@/components/override-map-context";

export function FullLoadingOverlay() {
  const { isFullLoading } = useOverrideMap();
  if (!isFullLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/40">
      <div className="animate-spin h-8 w-8 border-3 border-accent-primary border-t-transparent rounded-full" />
    </div>
  );
}
