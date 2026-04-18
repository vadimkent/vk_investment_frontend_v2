"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Variant = "success" | "error" | "info" | "warning";

type SnackbarItem = {
  id: number;
  message: string;
  variant: Variant;
};

type SnackbarContextValue = {
  show: (message: string, variant?: Variant) => void;
};

const SnackbarContext = createContext<SnackbarContextValue>({
  show: () => {},
});

const variantStyles: Record<Variant, string> = {
  success: "bg-status-success",
  error: "bg-status-error",
  info: "bg-accent-primary",
  warning: "bg-status-warning",
};

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);

  const show = useCallback((message: string, variant: Variant = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 4000);
  }, []);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((it) => (
          <div
            key={it.id}
            className={`${variantStyles[it.variant]} text-content-on-accent px-4 py-3 rounded shadow-lg`}
          >
            {it.message}
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}
