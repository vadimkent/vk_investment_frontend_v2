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

describe("Select + FormStateContext", () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    cleanup();
  });

  it("keeps its hidden input value in sync with the default_value", async () => {
    const { SelectComponent } = await import("@/components/base/Select");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ provider: "yahoo" }}>
        <SelectComponent
          component={{
            type: "select",
            id: "s",
            props: {
              name: "provider",
              options: [
                { value: "yahoo", label: "Yahoo" },
                { value: "polygon", label: "Polygon" },
              ],
              default_value: "yahoo",
            },
          }}
        />
      </FormStateProvider>,
    );
    const hidden = container.querySelector(
      'input[type="hidden"][name="provider"]',
    ) as HTMLInputElement;
    expect(hidden.value).toBe("yahoo");
  });

  it("unmounts when its own visible_when is false", async () => {
    const { SelectComponent } = await import("@/components/base/Select");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ is_complex: true }}>
        <SelectComponent
          component={{
            type: "select",
            id: "s",
            props: {
              name: "provider",
              options: [{ value: "yahoo", label: "Yahoo" }],
              visible_when: { field: "is_complex", op: "eq", value: false },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(
      container.querySelector('input[type="hidden"][name="provider"]'),
    ).toBeNull();
  });

  it("clear button publishes empty value, which can hide a ne-based field", async () => {
    const { SelectComponent } = await import("@/components/base/Select");
    const { InputComponent } = await import("@/components/base/Input");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ provider: "yahoo" }}>
        <SelectComponent
          component={{
            type: "select",
            id: "s",
            props: {
              name: "provider",
              options: [{ value: "yahoo", label: "Yahoo" }],
              default_value: "yahoo",
            },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "i",
            props: {
              name: "external_ticker",
              visible_when: { field: "provider", op: "ne", value: "" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(
      container.querySelector('input[name="external_ticker"]'),
    ).not.toBeNull();
    const clearBtn = container.querySelector(
      'button[aria-label="Clear selection"]',
    ) as HTMLButtonElement;
    fireEvent.click(clearBtn);
    expect(container.querySelector('input[name="external_ticker"]')).toBeNull();
  });
});
