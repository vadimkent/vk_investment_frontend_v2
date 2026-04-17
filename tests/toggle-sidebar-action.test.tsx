import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe("toggle_sidebar action", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles sidebar state when button with toggle_sidebar action is clicked", async () => {
    const { render, act } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } = await import(
      "@/components/sidebar-provider"
    );
    const { ButtonComponent } = await import("@/components/base/Button");

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
