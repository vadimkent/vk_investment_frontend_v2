"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TableColumn = {
  id: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
};

const TableColumnsContext = createContext<TableColumn[]>([]);

export function TableColumnsProvider({
  columns,
  children,
}: {
  columns: TableColumn[];
  children: ReactNode;
}) {
  return (
    <TableColumnsContext.Provider value={columns}>
      {children}
    </TableColumnsContext.Provider>
  );
}

export function useTableColumns() {
  return useContext(TableColumnsContext);
}
