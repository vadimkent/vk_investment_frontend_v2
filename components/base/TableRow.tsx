"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useTableColumns } from "@/components/table-columns-context";
import { useRouter } from "next/navigation";

const alignClass: Record<string, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
};

export function TableRowComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const columns = useTableColumns();
  const hasActions = component.actions && component.actions.length > 0;

  function handleClick() {
    if (!hasActions) return;
    const action = component.actions![0];
    if (action.type === "navigate" && action.url) {
      if (action.target === "blank") {
        window.open(action.url, "_blank");
      } else {
        router.push(action.url);
      }
    }
  }

  const rowClass = [
    "border-b",
    hasActions ? "cursor-pointer hover:bg-gray-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="row"
      style={{
        display: "grid",
        gridTemplateColumns: "subgrid",
        gridColumn: "1 / -1",
      }}
      className={rowClass}
      onClick={hasActions ? handleClick : undefined}
      tabIndex={hasActions ? 0 : undefined}
    >
      {component.children?.map((child, i) => {
        const align = columns[i]?.align ?? "left";
        return (
          <div
            key={child.id}
            role="cell"
            className={`flex items-center px-4 py-3 ${alignClass[align]}`}
          >
            <ComponentRenderer component={child} />
          </div>
        );
      })}
    </div>
  );
}
