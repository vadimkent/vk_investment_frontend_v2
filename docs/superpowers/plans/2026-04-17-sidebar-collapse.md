# Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible sidebar with `toggle_sidebar` action, `sidebar_visibility` prop, and localStorage persistence.

**Architecture:** New `SidebarProvider` context (mirrors `ThemeProvider` pattern) holds `collapsed` boolean persisted in localStorage. `SidebarLayout` reads the context and switches between `240px` and `64px` grid columns. A `SidebarVisibilityGuard` wrapper in `SidebarLayout` filters children by their `sidebar_visibility` prop. `NavItemComponent` reads sidebar state to render icon-only mode with tooltip when collapsed.

**Tech Stack:** React 19 context, localStorage, Tailwind CSS, Vitest + @testing-library/react

---

### Task 1: SidebarProvider context

**Files:**

- Create: `components/sidebar-provider.tsx`
- Test: `tests/sidebar-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/sidebar-provider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";

describe("sidebar-provider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to expanded when localStorage is empty", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
  });

  it("reads collapsed state from localStorage", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { renderHook } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(true);
  });

  it("toggleSidebar flips state and persists", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.toggleSidebar());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem("sidebar-collapsed")).toBe("true");
    act(() => result.current.toggleSidebar());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem("sidebar-collapsed")).toBe("false");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sidebar-provider.test.tsx`
Expected: FAIL — module `@/components/sidebar-provider` not found

- [ ] **Step 3: Write the implementation**

Create `components/sidebar-provider.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  collapsed: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggleSidebar: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sidebar-provider.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/sidebar-provider.tsx tests/sidebar-provider.test.tsx
git commit -m "feat: add SidebarProvider context with localStorage persistence"
```

---

### Task 2: Mount SidebarProvider in root layout

**Files:**

- Modify: `app/layout.tsx`

- [ ] **Step 1: Add SidebarProvider to the provider stack**

In `app/layout.tsx`, import `SidebarProvider` and wrap it around the existing providers, inside `ThemeProvider`:

```tsx
import { SidebarProvider } from "@/components/sidebar-provider";
```

Add it in the JSX between `<SensitiveProvider>` and `<OverrideMapProvider>`:

```tsx
<ThemeProvider>
  <SensitiveProvider>
    <SidebarProvider>
      <OverrideMapProvider>
        {children}
        <FullLoadingOverlay />
      </OverrideMapProvider>
    </SidebarProvider>
  </SensitiveProvider>
</ThemeProvider>
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: mount SidebarProvider in root layout"
```

---

### Task 3: Update SidebarLayout with collapse support and sidebar_visibility filtering

**Files:**

- Modify: `components/base/Screen.tsx`
- Test: `tests/sidebar-layout.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/sidebar-layout.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";

describe("SidebarLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders with 240px grid when expanded", async () => {
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { ScreenComponent } = await import("@/components/base/Screen");

    const component = {
      type: "screen" as const,
      id: "test-screen",
      props: { nav_type: "sidebar" },
      children: [
        { type: "nav_header", id: "hdr", props: {}, children: [] },
        { type: "content_slot", id: "content", props: {} },
      ],
    };

    const { container } = render(
      <SidebarProvider>
        <ScreenComponent component={component} />
      </SidebarProvider>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("240px 1fr");
  });

  it("renders with 64px grid when collapsed", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { ScreenComponent } = await import("@/components/base/Screen");

    const component = {
      type: "screen" as const,
      id: "test-screen",
      props: { nav_type: "sidebar" },
      children: [
        { type: "nav_header", id: "hdr", props: {}, children: [] },
        { type: "content_slot", id: "content", props: {} },
      ],
    };

    const { container } = render(
      <SidebarProvider>
        <ScreenComponent component={component} />
      </SidebarProvider>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("64px 1fr");
  });

  it("hides children with sidebar_visibility='expanded' when collapsed", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { ScreenComponent } = await import("@/components/base/Screen");

    const component = {
      type: "screen" as const,
      id: "test-screen",
      props: { nav_type: "sidebar" },
      children: [
        {
          type: "nav_header",
          id: "hdr",
          props: {},
          children: [
            {
              type: "text",
              id: "brand-full",
              props: { content: "Full Brand", sidebar_visibility: "expanded" },
            },
            {
              type: "text",
              id: "brand-icon",
              props: { content: "B", sidebar_visibility: "collapsed" },
            },
          ],
        },
        { type: "content_slot", id: "content", props: {} },
      ],
    };

    const { queryByText } = render(
      <SidebarProvider>
        <ScreenComponent component={component} />
      </SidebarProvider>,
    );

    expect(queryByText("Full Brand")).toBeNull();
    expect(queryByText("B")).not.toBeNull();
  });

  it("hides children with sidebar_visibility='collapsed' when expanded", async () => {
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { ScreenComponent } = await import("@/components/base/Screen");

    const component = {
      type: "screen" as const,
      id: "test-screen",
      props: { nav_type: "sidebar" },
      children: [
        {
          type: "nav_header",
          id: "hdr",
          props: {},
          children: [
            {
              type: "text",
              id: "brand-full",
              props: { content: "Full Brand", sidebar_visibility: "expanded" },
            },
            {
              type: "text",
              id: "brand-icon",
              props: { content: "B", sidebar_visibility: "collapsed" },
            },
          ],
        },
        { type: "content_slot", id: "content", props: {} },
      ],
    };

    const { queryByText } = render(
      <SidebarProvider>
        <ScreenComponent component={component} />
      </SidebarProvider>,
    );

    expect(queryByText("Full Brand")).not.toBeNull();
    expect(queryByText("B")).toBeNull();
  });

  it("shows children with sidebar_visibility='always' in both states", async () => {
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { ScreenComponent } = await import("@/components/base/Screen");

    const component = {
      type: "screen" as const,
      id: "test-screen",
      props: { nav_type: "sidebar" },
      children: [
        {
          type: "nav_header",
          id: "hdr",
          props: {},
          children: [
            {
              type: "text",
              id: "always-text",
              props: { content: "Always Here", sidebar_visibility: "always" },
            },
          ],
        },
        { type: "content_slot", id: "content", props: {} },
      ],
    };

    const { queryByText } = render(
      <SidebarProvider>
        <ScreenComponent component={component} />
      </SidebarProvider>,
    );

    expect(queryByText("Always Here")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/sidebar-layout.test.tsx`
Expected: FAIL — SidebarLayout doesn't read collapse state or filter by sidebar_visibility

- [ ] **Step 3: Implement sidebar_visibility filtering and collapse layout**

Modify `components/base/Screen.tsx`. The `SidebarLayout` function needs to:

1. Import and use `useSidebar` from `@/components/sidebar-provider`
2. Switch grid columns based on `collapsed`
3. Filter nav children recursively based on `sidebar_visibility` prop
4. Add CSS transition

Replace the `SidebarLayout` function and add a helper:

```tsx
// Add import at top of file
import { useSidebar } from "@/components/sidebar-provider";

// Add helper function before SidebarLayout
function filterByVisibility(
  children: SDUIComponent[],
  collapsed: boolean,
): SDUIComponent[] {
  return children.reduce<SDUIComponent[]>((acc, child) => {
    const vis =
      (child.props.sidebar_visibility as string | undefined) ?? "always";
    if (vis === "expanded" && collapsed) return acc;
    if (vis === "collapsed" && !collapsed) return acc;
    if (child.children) {
      acc.push({
        ...child,
        children: filterByVisibility(child.children, collapsed),
      });
    } else {
      acc.push(child);
    }
    return acc;
  }, []);
}

// Replace SidebarLayout
function SidebarLayout({ component }: { component: SDUIComponent }) {
  const { collapsed } = useSidebar();
  const allChildren = component.children ?? [];
  const filtered = filterByVisibility(allChildren, collapsed);
  const navChildren = filtered.filter((c) => isNavSlot(c));
  const contentChildren = filtered.filter((c) => !isNavSlot(c));

  return (
    <div
      className="min-h-screen transition-[grid-template-columns] duration-200"
      style={{
        display: "grid",
        gridTemplateColumns: collapsed ? "64px 1fr" : "240px 1fr",
      }}
    >
      <div className="flex flex-col border-r border-border bg-surface-primary h-screen sticky top-0 overflow-y-auto">
        {navChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
      <div className="flex flex-col min-h-screen [&>*:only-child]:flex-1">
        {contentChildren.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/sidebar-layout.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Run all tests to check for regressions**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/base/Screen.tsx tests/sidebar-layout.test.tsx
git commit -m "feat: add sidebar collapse layout and sidebar_visibility filtering"
```

---

### Task 4: Update NavItemComponent for icon-only collapsed mode

**Files:**

- Modify: `components/base/NavItem.tsx`
- Test: `tests/nav-item-collapsed.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/nav-item-collapsed.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";

describe("NavItemComponent collapsed mode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows label when sidebar is expanded", async () => {
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { NavItemComponent } = await import("@/components/base/NavItem");

    const component = {
      type: "nav_item" as const,
      id: "nav-home",
      props: { label: "Home", icon: "home" },
      actions: [{ trigger: "click", type: "navigate", url: "/" }],
    };

    const { getByText } = render(
      <SidebarProvider>
        <NavItemComponent component={component} />
      </SidebarProvider>,
    );

    expect(getByText("Home")).not.toBeNull();
  });

  it("hides label when sidebar is collapsed", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { NavItemComponent } = await import("@/components/base/NavItem");

    const component = {
      type: "nav_item" as const,
      id: "nav-home",
      props: { label: "Home", icon: "home" },
      actions: [{ trigger: "click", type: "navigate", url: "/" }],
    };

    const { queryByText } = render(
      <SidebarProvider>
        <NavItemComponent component={component} />
      </SidebarProvider>,
    );

    expect(queryByText("Home")).toBeNull();
  });

  it("shows tooltip with label when collapsed", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { NavItemComponent } = await import("@/components/base/NavItem");

    const component = {
      type: "nav_item" as const,
      id: "nav-home",
      props: { label: "Home", icon: "home" },
      actions: [{ trigger: "click", type: "navigate", url: "/" }],
    };

    const { container } = render(
      <SidebarProvider>
        <NavItemComponent component={component} />
      </SidebarProvider>,
    );

    const button = container.querySelector("button");
    expect(button?.getAttribute("title")).toBe("Home");
  });

  it("centers icon when collapsed", async () => {
    localStorage.setItem("sidebar-collapsed", "true");
    const { render } = await import("@testing-library/react");
    const { SidebarProvider } = await import("@/components/sidebar-provider");
    const { NavItemComponent } = await import("@/components/base/NavItem");

    const component = {
      type: "nav_item" as const,
      id: "nav-home",
      props: { label: "Home", icon: "home" },
      actions: [{ trigger: "click", type: "navigate", url: "/" }],
    };

    const { container } = render(
      <SidebarProvider>
        <NavItemComponent component={component} />
      </SidebarProvider>,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("justify-center");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/nav-item-collapsed.test.tsx`
Expected: FAIL — NavItemComponent doesn't read sidebar state

- [ ] **Step 3: Update NavItemComponent**

Replace the entire `components/base/NavItem.tsx`:

```tsx
"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import { useRouter } from "next/navigation";
import { getIcon } from "@/lib/icon-registry";
import { stripScreens } from "@/lib/strip-screens";
import { useSidebar } from "@/components/sidebar-provider";

export function NavItemComponent({ component }: { component: SDUIComponent }) {
  const router = useRouter();
  const { collapsed } = useSidebar();
  const badgeCount = component.props.badge_count as number | undefined;
  const iconName = component.props.icon as string | undefined;
  const label = String(component.props.label);
  const Icon = iconName ? getIcon(iconName) : null;

  const handleClick = () => {
    const action = component.actions?.[0];
    if (!action) return;

    if (action.type === "navigate" && action.url) {
      router.push(stripScreens(action.url));
    }
  };

  return (
    <button
      onClick={handleClick}
      title={collapsed ? label : undefined}
      className={`flex items-center w-full px-3 py-2 rounded-md hover:bg-surface-secondary relative ${
        collapsed ? "justify-center" : "gap-3 text-left"
      }`}
    >
      {iconName != null && (
        <span className="text-content-muted relative">
          {Icon ? <Icon className="w-4 h-4" /> : String(iconName)}
          {badgeCount != null && badgeCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-status-error text-content-on-accent text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </span>
      )}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nav-item-collapsed.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/base/NavItem.tsx tests/nav-item-collapsed.test.tsx
git commit -m "feat: add icon-only collapsed mode to NavItemComponent"
```

---

### Task 5: Add `toggle_sidebar` action to ButtonComponent

**Files:**

- Modify: `components/base/Button.tsx`
- Test: `tests/toggle-sidebar-action.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/toggle-sidebar-action.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";

describe("toggle_sidebar action", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles sidebar state when button with toggle_sidebar action is clicked", async () => {
    const { render, act } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const { ButtonComponent } = await import("@/components/base/Button");
    const { renderHook } = await import("@testing-library/react");

    let sidebarState: { collapsed: boolean } = { collapsed: false };

    function SidebarReader() {
      sidebarState = useSidebar();
      return null;
    }

    const component = {
      type: "button" as const,
      id: "toggle-btn",
      props: { label: "Toggle" },
      actions: [{ trigger: "click", type: "toggle_sidebar" }],
    };

    const { getByText } = render(
      <SidebarProvider>
        <SidebarReader />
        <ButtonComponent component={component} />
      </SidebarProvider>,
    );

    expect(sidebarState.collapsed).toBe(false);
    await act(async () => {
      getByText("Toggle").click();
    });
    expect(sidebarState.collapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/toggle-sidebar-action.test.tsx`
Expected: FAIL — no `toggle_sidebar` case in Button

- [ ] **Step 3: Add toggle_sidebar case to Button.tsx**

In `components/base/Button.tsx`:

Add import:

```tsx
import { useSidebar } from "@/components/sidebar-provider";
```

Add destructure after the other hooks (after `const { toggleSensitive } = useSensitive();`):

```tsx
const { toggleSidebar } = useSidebar();
```

Add case after `toggle_sensitive` in the switch:

```tsx
      case "toggle_sidebar":
        toggleSidebar();
        break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/toggle-sidebar-action.test.tsx`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/base/Button.tsx tests/toggle-sidebar-action.test.tsx
git commit -m "feat: add toggle_sidebar action type to ButtonComponent"
```

---

### Task 6: Build and lint verification

**Files:** (none — verification only)

- [ ] **Step 1: Run lint**

Run: `make lint`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `make build`
Expected: Successful build with no type errors

- [ ] **Step 3: Run all tests**

Run: `make test`
Expected: All tests PASS

- [ ] **Step 4: Fix any issues found, then commit if changes were needed**
