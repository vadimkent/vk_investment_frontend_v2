"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useTableColumns } from "@/components/table-columns-context";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { stripScreens } from "@/lib/strip-screens";
import { substitutePlaceholders } from "@/lib/url-placeholders";

const alignClass: Record<string, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
};

function rowDetails(component: SDUIComponent): SDUIComponent[] | null {
  if (component.props?.expandable !== true) return null;
  const details = component.props?.details;
  if (!Array.isArray(details) || details.length === 0) return null;
  return details as SDUIComponent[];
}

export function TableRowComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const { columns, hasChevronColumn } = useTableColumns();
  const details = rowDetails(component);
  const isExpandable = details !== null;
  const hasActions = component.actions && component.actions.length > 0;

  const [expanded, setExpanded] = useState(false);

  function handleClick() {
    if (isExpandable) {
      setExpanded((prev) => !prev);
      return;
    }
    if (!hasActions) return;
    const action = component.actions![0];
    if (action.type === "navigate" && action.url) {
      const url = substitutePlaceholders(action.url, {});
      if (action.target === "blank") {
        window.open(url, "_blank");
      } else {
        router.push(stripScreens(url));
      }
    }
  }

  const interactive = isExpandable || hasActions;

  const rowClass = [
    "border-b border-border",
    interactive ? "cursor-pointer hover:bg-surface-secondary" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <>
      <div
        role="row"
        aria-expanded={isExpandable ? expanded : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: "subgrid",
          gridColumn: "1 / -1",
        }}
        className={rowClass}
        onClick={interactive ? handleClick : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {hasChevronColumn &&
          (isExpandable ? (
            <div className="flex items-center justify-center">
              <Chevron className="w-4 h-4 text-content-secondary" />
            </div>
          ) : (
            <div aria-hidden="true" />
          ))}
        {component.children?.map((child, i) => {
          const align = columns[i]?.align ?? "left";
          return (
            <div
              key={child.id}
              role="cell"
              className={`flex items-center px-4 py-3 min-w-0 ${alignClass[align]}`}
              title={
                typeof child.props?.content === "string"
                  ? child.props.content
                  : undefined
              }
            >
              <div className="truncate">
                <ComponentRenderer component={child} />
              </div>
            </div>
          );
        })}
      </div>
      {isExpandable && expanded && (
        <div
          data-table-row-details=""
          role="presentation"
          style={{ gridColumn: "1 / -1" }}
          className="border-b border-border bg-surface-secondary px-6 py-4"
        >
          {details!.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
        </div>
      )}
    </>
  );
}
