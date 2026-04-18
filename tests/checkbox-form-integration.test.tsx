import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

const dispatchSpy = vi.fn(() => Promise.resolve({ action: "none" }));
vi.mock("@/components/action-dispatcher", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/action-dispatcher")
  >("@/components/action-dispatcher");
  return { ...actual, useActionDispatcher: () => dispatchSpy };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

describe("Checkbox + FormStateContext", () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    cleanup();
  });

  it("publishes checked value and gates another field visibility", async () => {
    const { CheckboxComponent } = await import("@/components/base/Checkbox");
    const { InputComponent } = await import("@/components/base/Input");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ is_complex: false }}>
        <CheckboxComponent
          component={{
            type: "checkbox",
            id: "c",
            props: { name: "is_complex", label: "Complex" },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "i",
            props: {
              name: "external_ticker",
              visible_when: { field: "is_complex", op: "eq", value: false },
            },
          }}
        />
      </FormStateProvider>,
    );

    expect(
      container.querySelector('input[name="external_ticker"]'),
    ).not.toBeNull();
    const cb = container.querySelector(
      'input[name="is_complex"]',
    ) as HTMLInputElement;
    fireEvent.click(cb);
    expect(container.querySelector('input[name="external_ticker"]')).toBeNull();
  });

  it("does not dispatch change action when target_id form has invalid fields", async () => {
    const { CheckboxComponent } = await import("@/components/base/Checkbox");

    function buildFormWithInvalidField(): HTMLElement {
      const wrap = document.createElement("div");
      wrap.setAttribute("data-sdui-id", "form-x");
      const bad = document.createElement("input");
      bad.setAttribute("name", "ticker");
      bad.setAttribute("data-sdui-invalid", "true");
      wrap.appendChild(bad);
      return wrap;
    }

    const { container } = render(
      <>
        <div id="wrap" />
        <CheckboxComponent
          component={{
            type: "checkbox",
            id: "c",
            props: { name: "is_complex", label: "Complex" },
            actions: [
              {
                trigger: "change",
                type: "submit",
                endpoint: "/actions/assets/partial_update",
                target_id: "form-x",
              },
            ],
          }}
        />
      </>,
    );
    container.querySelector("#wrap")!.appendChild(buildFormWithInvalidField());

    const cb = container.querySelector(
      'input[name="is_complex"]',
    ) as HTMLInputElement;
    fireEvent.click(cb);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
