"use client";

import { createContext, useContext, type ReactNode } from "react";

const ShellChildrenContext = createContext<ReactNode>(null);

export function ShellChildrenProvider({
  value,
  children,
}: {
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <ShellChildrenContext.Provider value={value}>
      {children}
    </ShellChildrenContext.Provider>
  );
}

export function useShellChildren() {
  return useContext(ShellChildrenContext);
}
