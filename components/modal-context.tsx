"use client";

import { createContext, useContext } from "react";

export interface ModalContextValue {
  close: () => void;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue | null {
  return useContext(ModalContext);
}
