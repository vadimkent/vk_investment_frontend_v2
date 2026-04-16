import { describe, it, expect, beforeEach } from "vitest";

describe("theme-provider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light when localStorage is empty", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { ThemeProvider, useTheme } =
      await import("@/components/theme-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reads dark from localStorage and applies class", async () => {
    localStorage.setItem("theme", "dark");
    const { renderHook } = await import("@testing-library/react");
    const { ThemeProvider, useTheme } =
      await import("@/components/theme-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggle flips theme and persists", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { ThemeProvider, useTheme } =
      await import("@/components/theme-provider");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
