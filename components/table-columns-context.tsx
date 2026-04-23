"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TableColumn = {
  id: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
};

export type TableColumnsContextValue = {
  columns: TableColumn[];
  hasChevronColumn: boolean;
};

const TableColumnsContext = createContext<TableColumnsContextValue>({
  columns: [],
  hasChevronColumn: false,
});

export function TableColumnsProvider({
  columns,
  hasChevronColumn,
  children,
}: {
  columns: TableColumn[];
  hasChevronColumn: boolean;
  children: ReactNode;
}) {
  return (
    <TableColumnsContext.Provider value={{ columns, hasChevronColumn }}>
      {children}
    </TableColumnsContext.Provider>
  );
}

export function useTableColumns() {
  return useContext(TableColumnsContext);
}
