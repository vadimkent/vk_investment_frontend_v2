import { describe, it, expect, beforeEach } from "vitest";
import { hasInvalidFields } from "@/components/action-dispatcher";

describe("hasInvalidFields", () => {
  beforeEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  function mountContainer(targetId: string, invalid: boolean) {
    const div = document.createElement("div");
    div.setAttribute("data-sdui-id", targetId);
    const input = document.createElement("input");
    input.setAttribute("name", "a");
    if (invalid) input.setAttribute("data-sdui-invalid", "true");
    div.appendChild(input);
    document.body.appendChild(div);
  }

  it("returns false when target container is missing", () => {
    expect(hasInvalidFields("missing")).toBe(false);
  });

  it("returns false when no invalid descendants", () => {
    mountContainer("form-x", false);
    expect(hasInvalidFields("form-x")).toBe(false);
  });

  it("returns true when any descendant has data-sdui-invalid=true", () => {
    mountContainer("form-x", true);
    expect(hasInvalidFields("form-x")).toBe(true);
  });

  it("returns true when a required named input is empty (native validity)", () => {
    const div = document.createElement("div");
    div.setAttribute("data-sdui-id", "form-x");
    const input = document.createElement("input");
    input.setAttribute("name", "ticker");
    input.required = true;
    div.appendChild(input);
    document.body.appendChild(div);
    expect(hasInvalidFields("form-x")).toBe(true);
  });

  it("returns true when an email input has a bad value (native validity)", () => {
    const div = document.createElement("div");
    div.setAttribute("data-sdui-id", "form-x");
    const input = document.createElement("input");
    input.setAttribute("name", "email");
    input.type = "email";
    input.value = "not-an-email";
    div.appendChild(input);
    document.body.appendChild(div);
    expect(hasInvalidFields("form-x")).toBe(true);
  });

  it("ignores hidden inputs when scanning native validity", () => {
    const div = document.createElement("div");
    div.setAttribute("data-sdui-id", "form-x");
    const hidden = document.createElement("input");
    hidden.setAttribute("name", "provider");
    hidden.type = "hidden";
    hidden.required = true;
    hidden.value = "";
    div.appendChild(hidden);
    document.body.appendChild(div);
    expect(hasInvalidFields("form-x")).toBe(false);
  });
});
