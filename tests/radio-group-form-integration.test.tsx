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

describe("RadioGroup + FormStateContext", () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    cleanup();
  });

  it("publishes selected value and gates another field visibility", async () => {
    const { RadioGroupComponent } =
      await import("@/components/base/RadioGroup");
    const { InputComponent } = await import("@/components/base/Input");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ kind: "stock" }}>
        <RadioGroupComponent
          component={{
            type: "radio_group",
            id: "r",
            props: {
              name: "kind",
              options: [
                { value: "stock", label: "Stock" },
                { value: "bond", label: "Bond" },
              ],
              default_value: "stock",
            },
          }}
        />
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

    const bondRadio = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="kind"]'),
    ).find((r) => r.value === "bond")!;
    fireEvent.click(bondRadio);

    expect(container.querySelector('input[name="ticker"]')).toBeNull();
  });

  it("unmounts when its own visible_when is false", async () => {
    const { RadioGroupComponent } =
      await import("@/components/base/RadioGroup");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ mode: "off" }}>
        <RadioGroupComponent
          component={{
            type: "radio_group",
            id: "r",
            props: {
              name: "kind",
              options: [{ value: "a", label: "A" }],
              visible_when: { field: "mode", op: "eq", value: "on" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="kind"]')).toBeNull();
  });
});
