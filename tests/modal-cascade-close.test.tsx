import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import {
  OverrideMapProvider,
  useOverrideMap,
} from "@/components/override-map-context";
import { OverrideBoundary } from "@/components/override-boundary";
import { ModalContext } from "@/components/modal-context";
import { ModalComponent } from "@/components/base/Modal";
import type { SDUIComponent } from "@/lib/types/sdui";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => cleanup());

const dismissBtn: SDUIComponent = {
  type: "button",
  id: "btn",
  props: { label: "Dismiss" },
  actions: [{ trigger: "click", type: "dismiss" }],
};

const modalWithDismiss: SDUIComponent = {
  type: "modal",
  id: "m1",
  props: { visible: true, title: "Hi", dismissible: true },
  children: [dismissBtn],
};

describe("Modal cascade close", () => {
  it("standalone Modal: close hides Modal locally without any parent context", () => {
    // No outer ModalContext — Modal closes itself, no cascade needed.
    const { getByText, queryByText } = render(
      <ModalComponent component={modalWithDismiss} />,
    );
    expect(getByText("Hi")).not.toBeNull();
    fireEvent.click(getByText("Dismiss"));
    // Title gone — Modal returned null.
    expect(queryByText("Hi")).toBeNull();
  });

  it("Modal inside an outer ModalContext: close cascades to parent.close()", () => {
    const parentClose = vi.fn();
    const { getByText, queryByText } = render(
      <ModalContext.Provider value={{ close: parentClose }}>
        <ModalComponent component={modalWithDismiss} />
      </ModalContext.Provider>,
    );
    fireEvent.click(getByText("Dismiss"));
    expect(parentClose).toHaveBeenCalledTimes(1);
    expect(queryByText("Hi")).toBeNull();
  });

  it("Modal inside a -modal-slot: dismiss clears the slot override (no leftover empty overlay)", () => {
    function Seeder() {
      const { setOverride } = useOverrideMap();
      return (
        <button
          data-testid="seed"
          onClick={() => setOverride("foo-modal-slot", modalWithDismiss)}
        />
      );
    }
    function Probe() {
      const { getOverride } = useOverrideMap();
      return (
        <div data-testid="state">
          {getOverride("foo-modal-slot") ? "PRESENT" : "ABSENT"}
        </div>
      );
    }

    const { getByText, getByTestId } = render(
      <OverrideMapProvider>
        <Seeder />
        <Probe />
        <OverrideBoundary id="foo-modal-slot">
          <div>EMPTY</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );

    fireEvent.click(getByTestId("seed"));
    expect(getByTestId("state").textContent).toBe("PRESENT");
    expect(getByText("Hi")).not.toBeNull();

    // Dismiss: Modal.close cascades to slot's clearOverride
    fireEvent.click(getByText("Dismiss"));
    expect(getByTestId("state").textContent).toBe("ABSENT");
  });
});
