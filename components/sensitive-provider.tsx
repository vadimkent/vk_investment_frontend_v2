"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type SensitiveContextValue = {
  hideValues: boolean;
  toggleSensitive: () => void;
};

const SensitiveContext = createContext<SensitiveContextValue>({
  hideValues: false,
  toggleSensitive: () => {},
});

export function SensitiveProvider({ children }: { children: ReactNode }) {
  const [hideValues, setHideValues] = useState(false);

  const toggleSensitive = useCallback(() => {
    setHideValues((prev) => !prev);
  }, []);

  return (
    <SensitiveContext.Provider value={{ hideValues, toggleSensitive }}>
      {children}
    </SensitiveContext.Provider>
  );
}

export function useSensitive() {
  return useContext(SensitiveContext);
}
