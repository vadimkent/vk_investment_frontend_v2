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

function ModalSlotContext({
  slotId,
  withOverlay,
  children,
}: {
  slotId: string;
  withOverlay: boolean;
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
      {withOverlay ? (
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
      ) : (
        <>{children}</>
      )}
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
  // For -modal-slot overrides we always install a ModalContext so descendants
  // can `useModal()?.close()` to clear the slot. The visual overlay is rendered
  // only when the override doesn't carry its own chrome — `modal` renders its
  // own backdrop, so stacking the slot's would create a double overlay where
  // dismissing the inner modal leaves the outer shell behind.
  const isSlot = id.endsWith("-modal-slot") && !!override;
  const overrideHasOwnChrome = override?.type === "modal";
  const wrapped = isSlot ? (
    <ModalSlotContext slotId={id} withOverlay={!overrideHasOwnChrome}>
      {baseContent}
    </ModalSlotContext>
  ) : (
    <>{baseContent}</>
  );

  if (loading) return <SectionLoadingOverlay>{wrapped}</SectionLoadingOverlay>;
  return wrapped;
}
