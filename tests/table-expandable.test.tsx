import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { TableComponent } from "@/components/base/Table";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

afterEach(() => cleanup());

function table(children: SDUIComponent[]): SDUIComponent {
  return {
    type: "table",
    id: "t1",
    props: {
      columns: [
        { id: "a", header: "A", width: "100px" },
        { id: "b", header: "B" },
      ],
    },
    children,
  };
}

function row(
  id: string,
  cells: SDUIComponent[],
  extra: Partial<SDUIComponent> = {},
): SDUIComponent {
  return {
    type: "table_row",
    id,
    props: {},
    children: cells,
    ...extra,
  };
}

function textCell(id: string, content: string): SDUIComponent {
  return { type: "text", id, props: { content } };
}

describe("Table — chevron column auto-add", () => {
  it("does NOT prepend chevron column when no row is expandable", () => {
    const { container } = render(
      <TableComponent
        component={table([row("r1", [textCell("c1", "x"), textCell("c2", "y")])])}
      />,
    );
    const grid = container.querySelector('[role="table"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("100px 1fr");
  });

  it("prepends 24px chevron column when at least one row is expandable with details", () => {
    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "panel content")],
        },
      },
    );
    const { container } = render(
      <TableComponent component={table([expandableRow])} />,
    );
    const grid = container.querySelector('[role="table"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("24px 100px 1fr");
  });

  it("renders an empty chevron header cell before the column headers when expandable", () => {
    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "panel content")],
        },
      },
    );
    const { container } = render(
      <TableComponent component={table([expandableRow])} />,
    );
    const headers = container.querySelectorAll('[role="columnheader"]');
    // 1 chevron header + 2 real headers = 3
    expect(headers.length).toBe(3);
    // First header is the chevron column — empty text
    expect(headers[0].textContent).toBe("");
  });
});

describe("TableRow — chevron placeholder cell", () => {
  it("renders an empty placeholder cell for non-expandable rows when table has chevron column", () => {
    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "panel content")],
        },
      },
    );
    const plainRow = row("r2", [textCell("c3", "p"), textCell("c4", "q")]);
    const { container } = render(
      <TableComponent component={table([expandableRow, plainRow])} />,
    );
    // Find the plain row (id ends with r2). It should have one chevron-cell + 2 data cells = 3 total grid items.
    const rows = container.querySelectorAll('[role="row"]');
    // rows[0] = header, rows[1] = expandableRow, rows[2] = plainRow
    const plainRowEl = rows[2];
    // the placeholder div has no role — query direct children of the row element instead
    const directChildren = plainRowEl.children;
    expect(directChildren.length).toBe(3);
    // First child is the chevron placeholder — has aria-hidden
    expect(directChildren[0].getAttribute("aria-hidden")).toBe("true");
  });
});
