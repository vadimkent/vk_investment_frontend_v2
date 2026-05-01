"use client";

import { useOverrideMap } from "@/components/override-map-context";
import { CyclingMessage } from "@/components/cycling-message";

export function FullLoadingOverlay() {
  const { isFullLoading, fullLoadingMessages } = useOverrideMap();
  if (!isFullLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-overlay/40">
      <div className="animate-spin h-8 w-8 border-[3px] border-accent-primary border-t-transparent rounded-full" />
      <CyclingMessage messages={fullLoadingMessages} className="text-base" />
    </div>
  );
}
