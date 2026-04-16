"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { SDUIComponent } from "@/lib/types/sdui";

type OverrideMapContext = {
  getOverride: (id: string) => SDUIComponent | undefined;
  setOverride: (id: string, tree: SDUIComponent) => void;
  clearOverrides: () => void;
  isLoading: (id: string) => boolean;
  isFullLoading: boolean;
  setLoading: (id: string, mode: "section" | "full") => void;
  clearLoading: (id: string) => void;
};

const Ctx = createContext<OverrideMapContext>({
  getOverride: () => undefined,
  setOverride: () => {},
  clearOverrides: () => {},
  isLoading: () => false,
  isFullLoading: false,
  setLoading: () => {},
  clearLoading: () => {},
});

export function OverrideMapProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, SDUIComponent>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [fullLoading, setFullLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOverrides({});
    setLoadingIds(new Set());
    setFullLoading(false);
  }, [pathname]);

  const getOverride = useCallback((id: string) => overrides[id], [overrides]);
  const setOverride = useCallback(
    (id: string, tree: SDUIComponent) =>
      setOverrides((prev) => ({ ...prev, [id]: tree })),
    [],
  );
  const clearOverrides = useCallback(() => setOverrides({}), []);

  const isLoading = useCallback(
    (id: string) => loadingIds.has(id),
    [loadingIds],
  );

  const setLoadingFn = useCallback((id: string, mode: "section" | "full") => {
    if (mode === "full") {
      setFullLoading(true);
    } else {
      setLoadingIds((prev) => new Set(prev).add(id));
    }
  }, []);

  const clearLoadingFn = useCallback((id: string) => {
    setFullLoading(false);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        getOverride,
        setOverride,
        clearOverrides,
        isLoading,
        isFullLoading: fullLoading,
        setLoading: setLoadingFn,
        clearLoading: clearLoadingFn,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useOverrideMap() {
  return useContext(Ctx);
}
