import { describe, it, expect, beforeEach } from "vitest";

describe("sidebar-provider", () => {
  beforeEach(() => {
    document.cookie = "sidebar-collapsed=; max-age=0; path=/";
  });

  it("defaults to expanded when initialCollapsed is omitted", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
  });

  it("honors initialCollapsed prop", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { SidebarProvider, useSidebar } =
      await import("@/components/sidebar-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider initialCollapsed={true}>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(true);
  });

  it("toggleSidebar flips state and persists to cookie", async () => {
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
    expect(document.cookie).toContain("sidebar-collapsed=true");
    act(() => result.current.toggleSidebar());
    expect(result.current.collapsed).toBe(false);
    expect(document.cookie).toContain("sidebar-collapsed=false");
  });
});
