import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

describe("SidebarLayout", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.resetModules();
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
