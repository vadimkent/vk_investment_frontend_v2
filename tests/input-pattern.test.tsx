import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

function renderInput(props: Record<string, unknown>) {
  return render(
    <FormStateProvider initial={{}}>
      <InputComponent
        component={{
          type: "input",
          id: "test-input",
          props: { name: "ticker", ...props },
        }}
      />
    </FormStateProvider>,
  );
}

describe("Input pattern validation", () => {
  it("does not mark valid values as invalid on input", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "AAPL" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("marks invalid values on input", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.getAttribute("data-sdui-invalid")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("treats empty value as valid even with pattern", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });

  it("invalid regex is silently ignored", () => {
    const { container } = renderInput({ pattern: "[unclosed" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "anything" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });

  it("does not mark invalid on mount even if default_value fails pattern", () => {
    const { container } = renderInput({
      pattern: "^[A-Z]+$",
      default_value: "aapl",
    });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });
});
