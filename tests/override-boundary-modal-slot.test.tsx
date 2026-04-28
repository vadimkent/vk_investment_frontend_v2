import { describe, it, expect, afterEach, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  type RenderResult,
} from "@testing-library/react";
import {
  OverrideMapProvider,
  useOverrideMap,
} from "@/components/override-map-context";
import { OverrideBoundary } from "@/components/override-boundary";
import type { SDUIComponent } from "@/lib/types/sdui";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

afterEach(() => cleanup());

function Seed({ id, tree }: { id: string; tree: SDUIComponent }) {
  const { setOverride } = useOverrideMap();
  return (
    <button data-testid={`seed-${id}`} onClick={() => setOverride(id, tree)} />
  );
}

const replacement: SDUIComponent = {
  type: "text",
  id: "replacement-text",
  props: { content: "OVERLAY_CONTENT" },
};

function setup(slotId: string): RenderResult {
  return render(
    <OverrideMapProvider>
      <Seed id={slotId} tree={replacement} />
      <OverrideBoundary id={slotId}>
        <div data-testid="empty-slot">EMPTY</div>
      </OverrideBoundary>
    </OverrideMapProvider>,
  );
}

describe("OverrideBoundary modal slot pattern", () => {
  it("renders the empty children when no override is set, regardless of id", () => {
    const { getByTestId, queryByTestId } = setup("snapshots-modal-slot");
    expect(getByTestId("empty-slot")).not.toBeNull();
    expect(queryByTestId("modal-overlay")).toBeNull();
  });

  it("wraps the override content in an overlay when id ends with -modal-slot", () => {
    const { getByTestId, getByText } = setup("snapshots-modal-slot");
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    const overlay = getByTestId("modal-overlay");
    expect(overlay).not.toBeNull();
    // The override content lives inside the overlay wrapper
    expect(overlay.contains(getByText("OVERLAY_CONTENT"))).toBe(true);
  });

  it("does NOT wrap when id does not end with -modal-slot", () => {
    const { getByTestId, queryByTestId, getByText } = setup("regular-section");
    fireEvent.click(getByTestId("seed-regular-section"));
    expect(queryByTestId("modal-overlay")).toBeNull();
    // Content still renders, just not wrapped
    expect(getByText("OVERLAY_CONTENT")).not.toBeNull();
  });

  it("removes the overlay when the override is cleared", () => {
    function Clearer({ id }: { id: string }) {
      const { clearOverride } = useOverrideMap();
      return (
        <button data-testid={`clear-${id}`} onClick={() => clearOverride(id)} />
      );
    }
    const { getByTestId, queryByTestId } = render(
      <OverrideMapProvider>
        <Seed id="snapshots-modal-slot" tree={replacement} />
        <Clearer id="snapshots-modal-slot" />
        <OverrideBoundary id="snapshots-modal-slot">
          <div data-testid="empty-slot">EMPTY</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    expect(getByTestId("modal-overlay")).not.toBeNull();
    fireEvent.click(getByTestId("clear-snapshots-modal-slot"));
    expect(queryByTestId("modal-overlay")).toBeNull();
    expect(getByTestId("empty-slot")).not.toBeNull();
  });

  it("ESC key closes the overlay", () => {
    const { getByTestId, queryByTestId } = setup("snapshots-modal-slot");
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    expect(getByTestId("modal-overlay")).not.toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(queryByTestId("modal-overlay")).toBeNull();
  });

  it("clicking the backdrop closes the overlay", () => {
    const { getByTestId, queryByTestId } = setup("snapshots-modal-slot");
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    const overlay = getByTestId("modal-overlay");
    fireEvent.click(overlay);
    expect(queryByTestId("modal-overlay")).toBeNull();
  });

  it("clicking inside the dialog content does NOT close the overlay", () => {
    const { getByTestId, getByText } = setup("snapshots-modal-slot");
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    fireEvent.click(getByText("OVERLAY_CONTENT"));
    expect(getByTestId("modal-overlay")).not.toBeNull();
  });

  it("does NOT wrap the slot's overlay around a `modal` override (Modal carries its own chrome)", () => {
    const modalTree: SDUIComponent = {
      type: "modal",
      id: "inner-modal",
      props: { visible: true },
      children: [
        { type: "text", id: "mt", props: { content: "INSIDE_MODAL" } },
      ],
    };
    const { getByTestId, queryByTestId, getByText } = render(
      <OverrideMapProvider>
        <Seed id="snapshots-modal-slot" tree={modalTree} />
        <OverrideBoundary id="snapshots-modal-slot">
          <div>EMPTY</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("seed-snapshots-modal-slot"));
    // Modal renders its own overlay — but no slot-overlay wrapper around it.
    expect(queryByTestId("modal-overlay")).toBeNull();
    expect(getByText("INSIDE_MODAL")).not.toBeNull();
  });
});

describe("OverrideBoundary section loading overlay", () => {
  function LoadingControls({ id }: { id: string }) {
    const { setLoading, clearLoading } = useOverrideMap();
    return (
      <>
        <button
          data-testid="start-loading"
          onClick={() => setLoading(id, "section")}
        />
        <button data-testid="stop-loading" onClick={() => clearLoading(id)} />
      </>
    );
  }

  it("renders existing children behind a translucent overlay (does NOT unmount them)", () => {
    const { getByTestId, getByText } = render(
      <OverrideMapProvider>
        <LoadingControls id="my-section" />
        <OverrideBoundary id="my-section">
          <div data-testid="kid">VISIBLE_BEHIND_OVERLAY</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("start-loading"));
    // Children stay mounted (key UX win — preserves form state, context).
    expect(getByText("VISIBLE_BEHIND_OVERLAY")).not.toBeNull();
    expect(getByTestId("kid")).not.toBeNull();
    // Spinner is shown via the section-loading wrapper.
    expect(getByTestId("section-loading")).not.toBeNull();
  });

  it("removes the overlay when loading clears", () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <OverrideMapProvider>
        <LoadingControls id="my-section" />
        <OverrideBoundary id="my-section">
          <div>SOME_CONTENT</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("start-loading"));
    expect(getByTestId("section-loading")).not.toBeNull();
    fireEvent.click(getByTestId("stop-loading"));
    expect(queryByTestId("section-loading")).toBeNull();
    expect(getByText("SOME_CONTENT")).not.toBeNull();
  });

  it("blocks pointer events on the underlying content while loading", () => {
    const { getByTestId, container } = render(
      <OverrideMapProvider>
        <LoadingControls id="my-section" />
        <OverrideBoundary id="my-section">
          <div data-testid="kid">BLOCKED</div>
        </OverrideBoundary>
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("start-loading"));
    const wrapper = container.querySelector(".pointer-events-none");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.contains(getByTestId("kid"))).toBe(true);
  });
});
