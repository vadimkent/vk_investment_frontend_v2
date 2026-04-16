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
};

const Ctx = createContext<OverrideMapContext>({
  getOverride: () => undefined,
  setOverride: () => {},
  clearOverrides: () => {},
});

export function OverrideMapProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, SDUIComponent>>({});
  const pathname = usePathname();

  useEffect(() => {
    setOverrides({});
  }, [pathname]);

  const getOverride = useCallback((id: string) => overrides[id], [overrides]);
  const setOverride = useCallback(
    (id: string, tree: SDUIComponent) =>
      setOverrides((prev) => ({ ...prev, [id]: tree })),
    [],
  );
  const clearOverrides = useCallback(() => setOverrides({}), []);

  return (
    <Ctx.Provider value={{ getOverride, setOverride, clearOverrides }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOverrideMap() {
  return useContext(Ctx);
}
