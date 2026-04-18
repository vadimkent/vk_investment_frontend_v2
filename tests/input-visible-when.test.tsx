import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("Input visible_when", () => {
  it("renders when evaluation is true", () => {
    const { container } = render(
      <FormStateProvider initial={{ kind: "stock" }}>
        <InputComponent
          component={{
            type: "input",
            id: "t",
            props: {
              name: "ticker",
              visible_when: { field: "kind", op: "eq", value: "stock" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="ticker"]')).not.toBeNull();
  });

  it("unmounts when evaluation is false", () => {
    const { container } = render(
      <FormStateProvider initial={{ kind: "bond" }}>
        <InputComponent
          component={{
            type: "input",
            id: "t",
            props: {
              name: "ticker",
              visible_when: { field: "kind", op: "eq", value: "stock" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="ticker"]')).toBeNull();
  });

  it("is always visible outside a FormStateProvider (fail open)", () => {
    const { container } = render(
      <InputComponent
        component={{
          type: "input",
          id: "t",
          props: {
            name: "ticker",
            visible_when: { field: "kind", op: "eq", value: "stock" },
          },
        }}
      />,
    );
    expect(container.querySelector('input[name="ticker"]')).not.toBeNull();
  });
});
