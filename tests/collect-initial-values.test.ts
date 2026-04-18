import { describe, it, expect } from "vitest";
import { collectInitialValues } from "@/lib/collect-initial-values";
import type { SDUIComponent } from "@/lib/types/sdui";

function c(
  type: string,
  id: string,
  props: Record<string, unknown> = {},
  children?: SDUIComponent[],
): SDUIComponent {
  return { type, id, props, children };
}

describe("collectInitialValues", () => {
  it("returns empty object for a leaf node with no form children", () => {
    expect(collectInitialValues(c("text", "t1", { content: "hi" }))).toEqual(
      {},
    );
  });

  it("reads input default_value", () => {
    const tree = c("form", "f", {}, [
      c("input", "i", { name: "ticker", default_value: "AAPL" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({ ticker: "AAPL" });
  });

  it("defaults input value to empty string when no default_value", () => {
    const tree = c("form", "f", {}, [c("input", "i", { name: "note" })]);
    expect(collectInitialValues(tree)).toEqual({ note: "" });
  });

  it("reads checkbox default (checked)", () => {
    const tree = c("form", "f", {}, [
      c("checkbox", "c1", { name: "is_complex", checked: true }),
      c("checkbox", "c2", { name: "archived" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({
      is_complex: true,
      archived: false,
    });
  });

  it("reads select and radio_group default_value", () => {
    const tree = c("form", "f", {}, [
      c("select", "s", { name: "provider", default_value: "yahoo" }),
      c("radio_group", "r", { name: "kind", default_value: "stock" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({
      provider: "yahoo",
      kind: "stock",
    });
  });

  it("reads textarea default_value", () => {
    const tree = c("form", "f", {}, [
      c("textarea", "t", { name: "notes", default_value: "hello" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({ notes: "hello" });
  });

  it("recurses into nested containers", () => {
    const tree = c("form", "f", {}, [
      c("column", "col", {}, [
        c("card", "card", {}, [
          c("input", "i", { name: "ticker", default_value: "AAPL" }),
        ]),
      ]),
    ]);
    expect(collectInitialValues(tree)).toEqual({ ticker: "AAPL" });
  });

  it("skips components without a name prop", () => {
    const tree = c("form", "f", {}, [
      c("input", "i", { default_value: "no-name" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({});
  });

  it("does not descend into nested form or modal children", () => {
    const tree = c("form", "outer", {}, [
      c("input", "a", { name: "outer_field", default_value: "OUT" }),
      c("form", "inner-form", {}, [
        c("input", "b", { name: "inner_field", default_value: "IN" }),
      ]),
      c("modal", "inner-modal", {}, [
        c("input", "c", { name: "modal_field", default_value: "MODAL" }),
      ]),
    ]);
    expect(collectInitialValues(tree)).toEqual({ outer_field: "OUT" });
  });
});
