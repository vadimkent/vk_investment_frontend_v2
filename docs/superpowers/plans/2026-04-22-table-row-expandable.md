# Table Row Expandable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `expandable` + `details` capability to the `table_row` base SDUI component so rows can toggle a full-width panel rendered directly below them.

**Architecture:** Additive change. `Table.tsx` detects whether any child row declares `expandable: true` with non-empty `details`, prepends a 24px chevron column to its grid, and broadcasts `hasChevronColumn` through a renamed context. `TableRow.tsx` reads the context, conditionally renders a chevron cell at index 0, and — when the row itself is expandable — manages local `useState` to toggle a sibling panel emitted via React Fragment that uses `gridColumn: "1 / -1"` to break the subgrid. The expansion state is keyed implicitly by `child.id` (already used as React `key` in `Table.tsx:46`), so any backend `replace` that rebuilds the subtree drops the state naturally.

**Tech Stack:** Next.js 15 / React 19 / TypeScript / Tailwind CSS / `lucide-react` (chevron icons, already in deps) / Vitest + jsdom + `@testing-library/react` (existing test infra).

**Decisions (locked, do not revisit):**

1. `details` lives in `props.details: SDUIComponent[]` (per spec, even though it's the first base component to put a subtree in `props`).
2. `expandable: true` wins over `actions: [...]` on the same row — toggle runs, actions are ignored client-side.
3. `expandable: true` with empty/missing `details` is silently treated as non-expandable (no chevron, no toggle).

---

## File Structure

**Modify:**

- `components/table-columns-context.tsx` — change context value from `TableColumn[]` to `{ columns, hasChevronColumn }`.
- `components/base/Table.tsx` — detect expandable rows, prepend chevron column to `gridTemplateColumns`, render empty chevron header, pass `hasChevronColumn` to provider.
- `components/base/TableRow.tsx` — render chevron placeholder cell when context says so; when row is expandable+has-details: render chevron icon, manage `useState` toggle, ignore actions, render details panel as Fragment sibling spanning all columns.
- `spec/sdui-base-components.md` — update `### table` and `### table_row` entries to document the new behavior.

**Create:**

- `tests/table-columns-context.test.tsx` — context shape regression.
- `tests/table-expandable.test.tsx` — end-to-end behaviors (chevron column auto-add, toggle, panel rendering, expandable-wins-over-actions, silent fallback for empty details).

---

## Task 1: Extend `TableColumnsProvider` context shape

**Files:**

- Modify: `components/table-columns-context.tsx` (full rewrite, file is 31 lines)
- Test: `tests/table-columns-context.test.tsx` (new)

- [ ] **Step 1: Write failing test**

Create `tests/table-columns-context.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  TableColumnsProvider,
  useTableColumns,
} from "@/components/table-columns-context";

afterEach(() => cleanup());

function Probe() {
  const value = useTableColumns();
  return (
    <div
      data-testid="probe"
      data-cols={value.columns.length}
      data-chevron={String(value.hasChevronColumn)}
    />
  );
}

describe("TableColumnsProvider", () => {
  it("exposes columns and hasChevronColumn=false by default", () => {
    const { getByTestId } = render(
      <TableColumnsProvider
        columns={[{ id: "a", header: "A" }]}
        hasChevronColumn={false}
      >
        <Probe />
      </TableColumnsProvider>,
    );
    const probe = getByTestId("probe");
    expect(probe.getAttribute("data-cols")).toBe("1");
    expect(probe.getAttribute("data-chevron")).toBe("false");
  });

  it("exposes hasChevronColumn=true when provided", () => {
    const { getByTestId } = render(
      <TableColumnsProvider columns={[]} hasChevronColumn={true}>
        <Probe />
      </TableColumnsProvider>,
    );
    expect(getByTestId("probe").getAttribute("data-chevron")).toBe("true");
  });

  it("returns empty columns and hasChevronColumn=false outside any provider", () => {
    const { getByTestId } = render(<Probe />);
    const probe = getByTestId("probe");
    expect(probe.getAttribute("data-cols")).toBe("0");
    expect(probe.getAttribute("data-chevron")).toBe("false");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run tests/table-columns-context.test.tsx`
Expected: TypeScript / runtime error — `value.columns` and `hasChevronColumn` don't exist on the current return type (which is `TableColumn[]`).

- [ ] **Step 3: Rewrite the context module**

Replace the entire content of `components/table-columns-context.tsx` with:

```tsx
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
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run tests/table-columns-context.test.tsx`
Expected: 3 passing tests.

- [ ] **Step 5: Adjust the only caller so the rest of the app still typechecks**

`components/base/TableRow.tsx:18` currently does `const columns = useTableColumns();`. Change it to destructure:

```tsx
const { columns } = useTableColumns();
```

(No other behavioral change in this task — `hasChevronColumn` is wired in Task 3.)

`components/base/Table.tsx:20` currently passes only `columns` to the provider. Update the JSX so it also passes `hasChevronColumn={false}` for now (we'll compute it for real in Task 2):

```tsx
<TableColumnsProvider columns={columns} hasChevronColumn={false}>
```

- [ ] **Step 6: Run typecheck and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add components/table-columns-context.tsx components/base/Table.tsx components/base/TableRow.tsx tests/table-columns-context.test.tsx
git commit -m "refactor(table): extend columns context with hasChevronColumn flag"
```

---

## Task 2: `Table` detects expandable rows and prepends a 24px chevron column

**Files:**

- Modify: `components/base/Table.tsx` (full rewrite, file is 51 lines)
- Test: `tests/table-expandable.test.tsx` (new — first 3 tests in this task)

- [ ] **Step 1: Write failing tests**

Create `tests/table-expandable.test.tsx`:

```tsx
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
        component={table([
          row("r1", [textCell("c1", "x"), textCell("c2", "y")]),
        ])}
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
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: All 3 fail — second test sees `"100px 1fr"` instead of `"24px 100px 1fr"`; third sees 2 headers instead of 3.

- [ ] **Step 3: Update `components/base/Table.tsx`**

Replace the entire file with:

```tsx
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

function rowIsExpandable(child: SDUIComponent): boolean {
  if (child.type !== "table_row") return false;
  if (child.props?.expandable !== true) return false;
  const details = child.props?.details;
  return Array.isArray(details) && details.length > 0;
}

export function TableComponent({ component }: { component: SDUIComponent }) {
  const columns = (component.props.columns as TableColumn[] | undefined) ?? [];
  const children = component.children ?? [];
  const hasChevronColumn = children.some(rowIsExpandable);

  const baseWidths =
    columns.length > 0 ? columns.map((c) => c.width ?? "1fr").join(" ") : "1fr";
  const widths = hasChevronColumn ? `24px ${baseWidths}` : baseWidths;

  return (
    <TableColumnsProvider columns={columns} hasChevronColumn={hasChevronColumn}>
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
          {hasChevronColumn && <div role="columnheader" aria-hidden="true" />}
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
        {children.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </TableColumnsProvider>
  );
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: 3 passing tests.

- [ ] **Step 5: Run full suite to confirm no regression**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/base/Table.tsx tests/table-expandable.test.tsx
git commit -m "feat(table): auto-prepend 24px chevron column when any row is expandable"
```

---

## Task 3: `TableRow` renders chevron placeholder cell for non-expandable rows

A non-expandable row inside a table that has at least one expandable row must still render an empty cell at grid index 0 to keep the subgrid aligned with the chevron column.

**Files:**

- Modify: `components/base/TableRow.tsx`
- Test: `tests/table-expandable.test.tsx` (append a test)

- [ ] **Step 1: Append failing test to `tests/table-expandable.test.tsx`**

Inside the existing file, add a new `describe` block at the bottom:

```tsx
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
    // chevron cell uses role="presentation" so query its direct children differently:
    const directChildren = plainRowEl.children;
    expect(directChildren.length).toBe(3);
    // First child is the chevron placeholder — has aria-hidden
    expect(directChildren[0].getAttribute("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: new test fails — plainRow has 2 children, not 3.

- [ ] **Step 3: Update `components/base/TableRow.tsx`**

Replace the entire file with:

```tsx
"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { useTableColumns } from "@/components/table-columns-context";
import { useRouter } from "next/navigation";
import { stripScreens } from "@/lib/strip-screens";
import { substitutePlaceholders } from "@/lib/url-placeholders";

const alignClass: Record<string, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
};

export function TableRowComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const { columns, hasChevronColumn } = useTableColumns();
  const hasActions = component.actions && component.actions.length > 0;

  function handleClick() {
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

  const rowClass = [
    "border-b border-border",
    hasActions ? "cursor-pointer hover:bg-surface-secondary" : "",
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
      {hasChevronColumn && <div aria-hidden="true" />}
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
  );
}
```

(Note: this version still does NOT handle the expandable behavior — that's Task 4. We only added the chevron placeholder cell.)

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: 4 passing tests in this file.

- [ ] **Step 5: Full suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/base/TableRow.tsx tests/table-expandable.test.tsx
git commit -m "feat(table_row): render chevron placeholder cell to preserve subgrid alignment"
```

---

## Task 4: `TableRow` becomes expandable — chevron icon, click toggles, ignores actions, renders details panel

**Files:**

- Modify: `components/base/TableRow.tsx` (full rewrite again — the file is small and a single rewrite is clearer than three sequential edits)
- Test: `tests/table-expandable.test.tsx` (append tests)

- [ ] **Step 1: Append failing tests**

Append to `tests/table-expandable.test.tsx`:

```tsx
import { fireEvent } from "@testing-library/react";

describe("TableRow — expandable behavior", () => {
  it("renders ChevronDown icon when collapsed", () => {
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
    // lucide-react renders SVGs with class containing "lucide-chevron-down" / "lucide-chevron-up"
    expect(container.querySelector(".lucide-chevron-down")).not.toBeNull();
    expect(container.querySelector(".lucide-chevron-up")).toBeNull();
  });

  it("clicking the row toggles to expanded — chevron flips to up and panel renders", () => {
    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "PANEL")],
        },
      },
    );
    const { container, getByText, queryByText } = render(
      <TableComponent component={table([expandableRow])} />,
    );

    // Initially collapsed: panel content not in DOM
    expect(queryByText("PANEL")).toBeNull();

    // Click the main row (the one rendering cells, not the header)
    const rows = container.querySelectorAll('[role="row"]');
    fireEvent.click(rows[1] as HTMLElement);

    // Now expanded
    expect(getByText("PANEL")).not.toBeNull();
    expect(container.querySelector(".lucide-chevron-up")).not.toBeNull();
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();

    // Click again → collapse
    fireEvent.click(rows[1] as HTMLElement);
    expect(queryByText("PANEL")).toBeNull();
  });

  it("expandable wins over actions — clicking does NOT navigate", () => {
    const pushSpy = vi.fn();
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: pushSpy, back: vi.fn() }),
    }));

    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "PANEL")],
        },
        actions: [{ trigger: "click", type: "navigate", url: "/somewhere" }],
      },
    );
    const { container, getByText } = render(
      <TableComponent component={table([expandableRow])} />,
    );
    const rows = container.querySelectorAll('[role="row"]');
    fireEvent.click(rows[1] as HTMLElement);

    // Panel is shown → toggle ran
    expect(getByText("PANEL")).not.toBeNull();
    // Navigation did NOT run
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("renders the details panel as a full-width sibling spanning all columns", () => {
    const expandableRow = row(
      "r1",
      [textCell("c1", "x"), textCell("c2", "y")],
      {
        props: {
          expandable: true,
          details: [textCell("d1", "PANEL")],
        },
      },
    );
    const { container } = render(
      <TableComponent component={table([expandableRow])} />,
    );
    const rows = container.querySelectorAll('[role="row"]');
    fireEvent.click(rows[1] as HTMLElement);

    const panel = container.querySelector(
      "[data-table-row-details]",
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.style.gridColumn).toBe("1 / -1");
    expect(panel.textContent).toContain("PANEL");
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: new tests fail — no chevron icon, no toggle behavior, no panel.

- [ ] **Step 3: Replace `components/base/TableRow.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: all tests in this file pass (8 in total now).

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add components/base/TableRow.tsx tests/table-expandable.test.tsx
git commit -m "feat(table_row): expandable rows toggle a full-width details panel on click"
```

---

## Task 5: Silent fallback — `expandable: true` with empty/missing `details` behaves like a plain row

The detection helper `rowDetails` already returns `null` when `details` is missing or empty, but there's no test locking this behavior in. Add explicit regression tests so future changes don't break the silent fallback.

**Files:**

- Modify: `tests/table-expandable.test.tsx` (append tests only — no production code changes)

- [ ] **Step 1: Append tests**

```tsx
describe("TableRow — silent fallback for invalid expandable", () => {
  it("expandable: true with no details renders no chevron and no toggle", () => {
    const r = row("r1", [textCell("c1", "x"), textCell("c2", "y")], {
      props: {
        expandable: true,
        // no details
      },
    });
    const { container, queryByText } = render(
      <TableComponent component={table([r])} />,
    );
    // No chevron column was added (this is the only row, and it's not really expandable)
    const grid = container.querySelector('[role="table"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("100px 1fr");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();

    // Clicking does nothing visible — no panel appears
    const rows = container.querySelectorAll('[role="row"]');
    fireEvent.click(rows[1] as HTMLElement);
    expect(queryByText("PANEL")).toBeNull();
  });

  it("expandable: true with details: [] is also treated as plain row", () => {
    const r = row("r1", [textCell("c1", "x"), textCell("c2", "y")], {
      props: { expandable: true, details: [] },
    });
    const { container } = render(<TableComponent component={table([r])} />);
    const grid = container.querySelector('[role="table"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("100px 1fr");
    expect(container.querySelector(".lucide-chevron-down")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect PASS (already covered by Task 2 + Task 4 logic)**

Run: `npx vitest run tests/table-expandable.test.tsx`
Expected: all tests pass — these new tests assert behavior that already holds because `rowIsExpandable` (Table) and `rowDetails` (TableRow) both require `Array.isArray(details) && length > 0`.

If they fail, verify those two predicates in `Table.tsx` and `TableRow.tsx` and fix.

- [ ] **Step 3: Commit**

```bash
git add tests/table-expandable.test.tsx
git commit -m "test(table_row): lock silent fallback for expandable without details"
```

---

## Task 6: Update `spec/sdui-base-components.md`

The spec file is the canonical source of truth. Update the `### table` and `### table_row` sections to document the new behavior.

**Files:**

- Modify: `spec/sdui-base-components.md` (lines 162–188 — verify exact line numbers before editing; the `### table` heading is at line 162 in the version at plan-write time)

- [ ] **Step 1: Replace the `### table` section**

Find the existing block (lines 162–174) and replace it with:

```markdown
### table

Tabular data with aligned columns across header and rows. The table owns column widths and alignment; rows and cells inherit them so the header and every body row line up automatically, regardless of cell content. Use `table` for data with parallel columns (positions, orders, transactions). Use `list` for uniform feeds without column structure.

| Prop    | Type                                                                                  | Required | Description                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| columns | `{ id: string; header: string; width?: string; align?: "left"\|"center"\|"right" }[]` | yes      | Column configuration. `width` accepts grid units (`"1fr"`, `"2fr"`, `"auto"`) or fixed CSS (`"120px"`). Missing `width` defaults to `"1fr"`. `align` defaults to `"left"`. |

Children must be `table_row` components. Each row's children are placed into the columns in order; the number of children per row should match `columns.length`.

**Chevron auto-column.** When at least one child row declares `expandable: true` with non-empty `details`, the table prepends a fixed `24px` column to `gridTemplateColumns` and renders an empty header cell at index 0. The chevron column is purely presentational — it is NOT part of `columns[]` and does NOT count toward `columns.length` for cell-count validation. When no row is expandable, the table renders exactly as before (no extra column).

- **React**: `TableComponent` -- `components/base/Table.tsx`
- **"use client"**: No (wraps children in a client `TableColumnsProvider` that exposes `columns` and `hasChevronColumn`)
- **Renders**: `div[role="table"]` as a CSS Grid with `grid-template-columns` derived from `columns[].width`, optionally prefixed with `24px` when chevron column is active. Header row renders above children with a bottom border and a muted background.
```

- [ ] **Step 2: Replace the `### table_row` section**

Find the existing block (lines 176–188) and replace it with:

```markdown
### table_row

A row inside a `table`. Uses CSS subgrid so every row shares the same column tracks as the table — the header and every body row align on the same boundaries. Supports `navigate` / `navigate_back` click actions for row-level interaction (e.g. row click opens a detail screen). Optionally togglable: when `expandable: true` and `details` is non-empty, the row toggles a full-width panel rendered directly below it.

| Prop       | Type          | Required | Description                                                                                                                                                                                                                                            |
| ---------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| expandable | boolean       | no       | Default `false`. When `true` AND `details` is a non-empty array, click anywhere on the main row toggles the details panel. The frontend renders a chevron indicator in the table's auto-added chevron column.                                          |
| details    | `Component[]` | no       | Subtree rendered as a full-width panel directly below the row when expanded. Pre-emitted in the tree (no fetch on expand). Must be non-empty for the row to be expandable; an empty or absent `details` silently downgrades the row to non-expandable. |

Each child of `table_row` is rendered into a cell (`div[role="cell"]`) and aligned according to the column's `align`. Use `text`, `badge`, `image`, or any component as a cell; the scaffold does not constrain cell content.

**Toggle and state.** When expandable, click on any cell of the main row toggles the panel. The chevron rotates between `ChevronDown` (collapsed) and `ChevronUp` (expanded). State is local to the frontend, keyed implicitly by the row's React `key` (the SDUI `id`). Multiple rows in the same table can be expanded simultaneously. State is lost on any `replace` that rebuilds the row's subtree (filter change, pagination, mutation refresh) and is not persisted across page loads. No round-trip on expand — `details` is already in the DOM.

**Interaction with `actions`.** When `expandable` is active (i.e. `expandable: true` and `details` non-empty), it takes precedence over `actions` — clicks toggle the panel and do not fire navigation. Backends should not combine the two on the same row.

**Panel rendering.** The details panel is emitted as a sibling grid item with `gridColumn: "1 / -1"`, breaking the subgrid and spanning all columns including the chevron column. Its content is arbitrary components (typically another `table`, a `column`, etc.).

- **React**: `TableRowComponent` -- `components/base/TableRow.tsx`
- **"use client"**: Yes (uses `useRouter` for click navigation, `useTableColumns` for per-cell alignment and chevron column awareness, and `useState` for expand/collapse state)
- **Renders**: `div[role="row"]` as a subgrid that spans all columns, optionally followed by a sibling panel `div[data-table-row-details][role="presentation"]` when expanded. Cells are wrapped in `div[role="cell"]` with `px-4 py-3` padding and alignment classes. When the table has a chevron column, every row also renders a leading 24px cell (chevron icon when expandable, empty placeholder otherwise). Adds `cursor-pointer hover:bg-surface-secondary` when the row is expandable or has actions.
```

- [ ] **Step 3: Verify the spec edits parse cleanly**

Run: `grep -n "^### table" spec/sdui-base-components.md`
Expected: the headings `### table` and `### table_row` still exist exactly once each, in the right order.

- [ ] **Step 4: Commit**

```bash
git add spec/sdui-base-components.md
git commit -m "docs(spec): document table_row expandable + table chevron auto-column"
```

---

## Task 7: Manual smoke test in dev server

Tests cover behavior; this task confirms it looks right in a real browser.

- [ ] **Step 1: Free port and start dev server**

```bash
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null; true
./cli run
```

- [ ] **Step 2: Add a temporary middleend fixture (or hit an existing screen) that emits a table with one expandable row and one plain row**

If middleend has not yet shipped the change, you can temporarily hardcode a fixture in any dev-only screen to exercise the frontend. Example payload to render:

```json
{
  "type": "table",
  "id": "smoke-table",
  "props": {
    "columns": [
      { "id": "name", "header": "Name", "width": "200px" },
      { "id": "qty", "header": "Qty", "width": "80px", "align": "right" },
      { "id": "note", "header": "Note" }
    ]
  },
  "children": [
    {
      "type": "table_row",
      "id": "row-1",
      "props": {
        "expandable": true,
        "details": [
          {
            "type": "text",
            "id": "d1",
            "props": { "content": "Expanded panel content for row 1" }
          }
        ]
      },
      "children": [
        { "type": "text", "id": "n1", "props": { "content": "Alice" } },
        { "type": "text", "id": "q1", "props": { "content": "3" } },
        { "type": "text", "id": "no1", "props": { "content": "first" } }
      ]
    },
    {
      "type": "table_row",
      "id": "row-2",
      "props": {},
      "children": [
        { "type": "text", "id": "n2", "props": { "content": "Bob" } },
        { "type": "text", "id": "q2", "props": { "content": "5" } },
        { "type": "text", "id": "no2", "props": { "content": "second" } }
      ]
    }
  ]
}
```

- [ ] **Step 3: Verify visually in `http://localhost:3000`**

Checklist:

- Header has an empty 24px column on the far left, then `Name`, `Qty`, `Note`.
- Row 1 has a `ChevronDown` icon in the chevron column. Row 2 has an empty cell in that column (alignment preserved).
- Click anywhere on Row 1 → chevron flips to `ChevronUp`, panel appears below spanning all columns including chevron.
- Click Row 1 again → collapses.
- Click Row 2 → nothing happens (no actions, not expandable).

- [ ] **Step 4: Remove the temporary fixture and commit nothing**

(This task produces no commits.)

---

## Self-review notes

- **Spec coverage:** prop `expandable` ✅ Task 4 + Task 6 docs. Slot `details` ✅ Task 4 + Task 6 docs. Chevron auto-column ✅ Tasks 2/3 + Task 6 docs. Toggle on cell click ✅ Task 4. State local + multiple rows ✅ Task 4 (`useState` per row instance). Persistence loss on replace ✅ implicit via React `key` lifecycle. No round-trip ✅ `details` in `props`, never fetched. Panel breaks subgrid ✅ Task 4 (`gridColumn: "1 / -1"` outside the subgrid row). Decision (1) `details` in `props` ✅. Decision (2) expandable wins over actions ✅ Task 4 + test. Decision (3) silent fallback ✅ Task 5 tests + helper logic in Task 2/4.
- **Type consistency:** `TableColumnsContextValue { columns, hasChevronColumn }` declared in Task 1 and consumed in `TableRow.tsx` (Task 3 / Task 4) and `Table.tsx` (Task 2). Helper `rowIsExpandable` (Table) and `rowDetails` (TableRow) use the same predicate `Array.isArray(details) && details.length > 0`.
- **No placeholders:** every step has full code or full commands. No "TODO" / "implement later" markers.
