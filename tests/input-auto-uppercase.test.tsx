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

describe("Input auto_uppercase", () => {
  it("transforms typed lowercase to uppercase", () => {
    const { container } = renderInput({ auto_uppercase: true });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("AAPL");
  });

  it("is a no-op when auto_uppercase is absent", () => {
    const { container } = renderInput({});
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("aapl");
  });

  it("combines with pattern: uppercase happens before validation", () => {
    const { container } = renderInput({
      auto_uppercase: true,
      pattern: "^[A-Z]+$",
    });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("AAPL");
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });
});
