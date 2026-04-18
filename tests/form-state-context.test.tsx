import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  FormStateProvider,
  useFieldValue,
  useFormState,
  evalVisibleWhen,
} from "@/components/form-state-context";
import type { ReactNode } from "react";

describe("evalVisibleWhen", () => {
  it("eq matches strictly equal values", () => {
    expect(evalVisibleWhen({ field: "x", op: "eq", value: "" }, "")).toBe(true);
    expect(evalVisibleWhen({ field: "x", op: "eq", value: "a" }, "b")).toBe(
      false,
    );
  });
  it("ne matches strictly non-equal values", () => {
    expect(evalVisibleWhen({ field: "x", op: "ne", value: "" }, "a")).toBe(
      true,
    );
    expect(evalVisibleWhen({ field: "x", op: "ne", value: false }, false)).toBe(
      false,
    );
  });
  it("unknown op fails open (returns true)", () => {
    expect(
      evalVisibleWhen({ field: "x", op: "xyz" as "eq", value: "a" }, "a"),
    ).toBe(true);
  });
  it("handles boolean and number equality", () => {
    expect(evalVisibleWhen({ field: "x", op: "eq", value: true }, true)).toBe(
      true,
    );
    expect(evalVisibleWhen({ field: "x", op: "eq", value: 3 }, 3)).toBe(true);
  });
});

describe("FormStateContext", () => {
  it("useFormState returns null outside a provider", () => {
    const { result } = renderHook(() => useFormState());
    expect(result.current).toBe(null);
  });

  it("useFieldValue returns undefined outside a provider", () => {
    const { result } = renderHook(() => useFieldValue("ticker"));
    expect(result.current).toBeUndefined();
  });

  it("seeds values from initial prop", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ ticker: "AAPL", complex: true }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(() => useFieldValue("ticker"), { wrapper });
    expect(result.current).toBe("AAPL");
  });

  it("setValue updates the value and triggers subscribers", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ ticker: "AAPL" }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(
      () => ({ value: useFieldValue("ticker"), ctx: useFormState() }),
      { wrapper },
    );
    expect(result.current.value).toBe("AAPL");
    act(() => {
      result.current.ctx!.setValue("ticker", "MSFT");
    });
    expect(result.current.value).toBe("MSFT");
  });

  it("subscribers of other fields do not re-render when unrelated field changes", () => {
    let renderCount = 0;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ a: "1", b: "2" }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(
      () => {
        renderCount++;
        return { a: useFieldValue("a"), ctx: useFormState() };
      },
      { wrapper },
    );
    const before = renderCount;
    act(() => {
      result.current.ctx!.setValue("b", "changed");
    });
    expect(renderCount).toBe(before);
  });
});
