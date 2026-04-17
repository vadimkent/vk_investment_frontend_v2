import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import {
  TableColumnsProvider,
  type TableColumn,
} from "@/components/table-columns-context";

const alignClass: Record<string, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
};

export function TableComponent({ component }: { component: SDUIComponent }) {
  const columns = (component.props.columns as TableColumn[] | undefined) ?? [];
  const widths =
    columns.length > 0 ? columns.map((c) => c.width ?? "1fr").join(" ") : "1fr";

  return (
    <TableColumnsProvider columns={columns}>
      <div
        role="table"
        style={{ display: "grid", gridTemplateColumns: widths }}
      >
        <div
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: "subgrid",
            gridColumn: "1 / -1",
          }}
          className="border-b border-border bg-surface-secondary font-medium text-sm text-content-secondary"
        >
          {columns.map((col) => (
            <div
              key={col.id}
              role="columnheader"
              className={`flex items-center px-4 py-3 min-w-0 ${alignClass[col.align ?? "left"]}`}
              title={col.header}
            >
              <span className="truncate">{col.header}</span>
            </div>
          ))}
        </div>
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </TableColumnsProvider>
  );
}
