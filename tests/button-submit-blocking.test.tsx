import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import type { SDUIComponent } from "@/lib/types/sdui";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const dispatchSpy = vi.fn(() => Promise.resolve({ action: "none" }));
vi.mock("@/components/action-dispatcher", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/action-dispatcher")
  >("@/components/action-dispatcher");
  return {
    ...actual,
    useActionDispatcher: () => dispatchSpy,
  };
});

function buildFormContainer(invalid: boolean): HTMLElement {
  const div = document.createElement("div");
  div.setAttribute("data-sdui-id", "form-x");
  const input = document.createElement("input");
  input.setAttribute("name", "ticker");
  if (invalid) input.setAttribute("data-sdui-invalid", "true");
  div.appendChild(input);
  return div;
}

describe("Button submit blocking", () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    cleanup();
  });

  it("does not dispatch when the target form contains an invalid field", async () => {
    const button: SDUIComponent = {
      type: "button",
      id: "submit-btn",
      props: { label: "Create" },
      actions: [
        {
          trigger: "click",
          type: "submit",
          endpoint: "/actions/assets/create",
          target_id: "form-x",
        },
      ],
    };

    const { ButtonComponent } = await import("@/components/base/Button");

    const { container } = render(
      <>
        <div id="form-wrap" />
        <ButtonComponent component={button} />
      </>,
    );
    container
      .querySelector("#form-wrap")!
      .appendChild(buildFormContainer(true));

    fireEvent.click(container.querySelector("button")!);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("dispatches when no invalid fields in the target form", async () => {
    const button: SDUIComponent = {
      type: "button",
      id: "submit-btn",
      props: { label: "Create" },
      actions: [
        {
          trigger: "click",
          type: "submit",
          endpoint: "/actions/assets/create",
          target_id: "form-x",
        },
      ],
    };

    const { ButtonComponent } = await import("@/components/base/Button");

    const { container } = render(
      <>
        <div id="form-wrap" />
        <ButtonComponent component={button} />
      </>,
    );
    container
      .querySelector("#form-wrap")!
      .appendChild(buildFormContainer(false));

    fireEvent.click(container.querySelector("button")!);
    expect(dispatchSpy).toHaveBeenCalledOnce();
  });
});
