"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useOverrideMap } from "@/components/override-map-context";
import { ModalContext } from "@/components/modal-context";
import { RawRenderer } from "@/components/renderer";

function SectionLoadingOverlay({ children }: { children: ReactNode }) {
  return (
    <div data-testid="section-loading" className="relative">
      <div className="opacity-50 pointer-events-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-overlay/30">
        <div
          role="status"
          aria-label="Loading"
          className="animate-spin h-5 w-5 border-2 border-accent-primary border-t-transparent rounded-full"
        />
      </div>
    </div>
  );
}

function ModalSlotOverlay({
  slotId,
  children,
}: {
  slotId: string;
  children: ReactNode;
}) {
  const { clearOverride } = useOverrideMap();
  const close = useCallback(
    () => clearOverride(slotId),
    [clearOverride, slotId],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <ModalContext.Provider value={{ close }}>
      <div
        data-testid="modal-overlay"
        data-modal-overlay
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-overlay/70 p-0 sm:p-4"
        onClick={close}
      >
        <div
          className="bg-surface-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>
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

  const baseContent = override ? (
    <RawRenderer component={override} />
  ) : (
    children
  );
  const wrapped =
    id.endsWith("-modal-slot") && override ? (
      <ModalSlotOverlay slotId={id}>{baseContent}</ModalSlotOverlay>
    ) : (
      <>{baseContent}</>
    );

  if (loading) return <SectionLoadingOverlay>{wrapped}</SectionLoadingOverlay>;
  return wrapped;
}
