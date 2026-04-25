"use client";

import type { ReactNode } from "react";
import { useOverrideMap } from "@/components/override-map-context";
import { RawRenderer } from "@/components/renderer";

function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin h-5 w-5 border-2 border-accent-primary border-t-transparent rounded-full" />
    </div>
  );
}

function ModalSlotOverlay({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="modal-overlay"
      data-modal-overlay
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-overlay/70 p-0 sm:p-4"
    >
      <div className="bg-surface-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
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

  if (loading) return <SectionLoading />;
  if (!override) return <>{children}</>;

  const content = <RawRenderer component={override} />;
  if (id.endsWith("-modal-slot")) {
    return <ModalSlotOverlay>{content}</ModalSlotOverlay>;
  }
  return <>{content}</>;
}
