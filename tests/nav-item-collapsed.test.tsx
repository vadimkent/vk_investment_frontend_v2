import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe("NavItemComponent collapsed mode", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.resetModules();
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
