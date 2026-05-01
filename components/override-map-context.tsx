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
  clearOverride: (id: string) => void;
  clearOverrides: () => void;
  isLoading: (id: string) => boolean;
  getLoadingMessages: (id: string) => string[];
  isFullLoading: boolean;
  fullLoadingMessages: string[];
  setLoading: (
    id: string,
    mode: "section" | "full",
    messages?: string[],
  ) => void;
  clearLoading: (id: string) => void;
};

const Ctx = createContext<OverrideMapContext>({
  getOverride: () => undefined,
  setOverride: () => {},
  clearOverride: () => {},
  clearOverrides: () => {},
  isLoading: () => false,
  getLoadingMessages: () => [],
  isFullLoading: false,
  fullLoadingMessages: [],
  setLoading: () => {},
  clearLoading: () => {},
});

export function OverrideMapProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, SDUIComponent>>({});
  const [loadingMap, setLoadingMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [fullLoading, setFullLoading] = useState<{
    active: boolean;
    messages: string[];
  }>({ active: false, messages: [] });
  const pathname = usePathname();

  useEffect(() => {
    setOverrides({});
    setLoadingMap(new Map());
    setFullLoading({ active: false, messages: [] });
  }, [pathname]);

  const getOverride = useCallback((id: string) => overrides[id], [overrides]);
  const setOverride = useCallback(
    (id: string, tree: SDUIComponent) =>
      setOverrides((prev) => {
        const next: Record<string, SDUIComponent> = {};
        const idsInTree = new Set<string>();
        collectIds(tree, idsInTree);
        for (const key of Object.keys(prev)) {
          if (key === id) continue;
          if (idsInTree.has(key)) continue;
          next[key] = prev[key];
        }
        next[id] = tree;
        return next;
      }),
    [],
  );
  const clearOverride = useCallback(
    (id: string) =>
      setOverrides((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }),
    [],
  );
  const clearOverrides = useCallback(() => setOverrides({}), []);

  const isLoading = useCallback(
    (id: string) => loadingMap.has(id),
    [loadingMap],
  );

  const getLoadingMessages = useCallback(
    (id: string) => loadingMap.get(id) ?? [],
    [loadingMap],
  );

  const setLoadingFn = useCallback(
    (id: string, mode: "section" | "full", messages: string[] = []) => {
      if (mode === "full") {
        setFullLoading({ active: true, messages });
      } else {
        setLoadingMap((prev) => {
          const next = new Map(prev);
          next.set(id, messages);
          return next;
        });
      }
    },
    [],
  );

  const clearLoadingFn = useCallback((id: string) => {
    setFullLoading({ active: false, messages: [] });
    setLoadingMap((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        getOverride,
        setOverride,
        clearOverride,
        clearOverrides,
        isLoading,
        getLoadingMessages,
        isFullLoading: fullLoading.active,
        fullLoadingMessages: fullLoading.messages,
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

function collectIds(node: SDUIComponent, out: Set<string>): void {
  out.add(node.id);
  if (node.children) {
    for (const child of node.children) collectIds(child, out);
  }
}
