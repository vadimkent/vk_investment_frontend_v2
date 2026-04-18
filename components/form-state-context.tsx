"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type VisibleWhen = {
  field: string;
  op: "eq" | "ne";
  value: unknown;
};

export interface FormStateContextValue {
  getValue: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
  subscribe: (name: string, cb: () => void) => () => void;
}

const FormStateContext = createContext<FormStateContextValue | null>(null);

export function useFormState(): FormStateContextValue | null {
  return useContext(FormStateContext);
}

export function useFieldValue(name: string): unknown {
  const ctx = useContext(FormStateContext);
  return useSyncExternalStore(
    (cb) => (ctx ? ctx.subscribe(name, cb) : () => {}),
    () => (ctx ? ctx.getValue(name) : undefined),
    () => (ctx ? ctx.getValue(name) : undefined),
  );
}

export function evalVisibleWhen(vw: VisibleWhen, value: unknown): boolean {
  switch (vw.op) {
    case "eq":
      return value === vw.value;
    case "ne":
      return value !== vw.value;
    default:
      return true;
  }
}

export function FormStateProvider({
  initial,
  children,
}: {
  initial: Record<string, unknown>;
  children: ReactNode;
}) {
  const valuesRef = useRef<Map<string, unknown> | null>(null);
  const listenersRef = useRef<Map<string, Set<() => void>> | null>(null);

  if (!valuesRef.current) {
    valuesRef.current = new Map(Object.entries(initial));
  }
  if (!listenersRef.current) {
    listenersRef.current = new Map();
  }

  const ctx = useMemo<FormStateContextValue>(() => {
    const values = valuesRef.current!;
    const listeners = listenersRef.current!;
    return {
      getValue(name) {
        return values.get(name);
      },
      setValue(name, value) {
        if (values.get(name) === value) return;
        values.set(name, value);
        listeners.get(name)?.forEach((cb) => cb());
      },
      subscribe(name, cb) {
        let set = listeners.get(name);
        if (!set) {
          set = new Set();
          listeners.set(name, set);
        }
        set.add(cb);
        return () => {
          set!.delete(cb);
        };
      },
    };
  }, []);

  return (
    <FormStateContext.Provider value={ctx}>
      {children}
    </FormStateContext.Provider>
  );
}
