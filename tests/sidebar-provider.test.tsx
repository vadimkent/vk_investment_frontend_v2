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
