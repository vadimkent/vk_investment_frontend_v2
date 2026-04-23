import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test",
}));

import {
  OverrideMapProvider,
  useOverrideMap,
} from "@/components/override-map-context";

afterEach(() => cleanup());

function Probe({ targetId }: { targetId: string }) {
  const { getOverride } = useOverrideMap();
  const override = getOverride(targetId);
  return (
    <div data-testid="probe" data-has-override={String(override !== undefined)}>
      {override ? override.id : "none"}
    </div>
  );
}

function Controls({
  setId,
  clearId,
}: {
  setId?: string;
  clearId?: string;
}) {
  const { setOverride, clearOverride } = useOverrideMap();
  return (
    <>
      <button
        data-testid="set"
        onClick={() =>
          setId &&
          setOverride(setId, { type: "text", id: "t1", props: {} })
        }
      />
      <button
        data-testid="clear"
        onClick={() => clearId && clearOverride(clearId)}
      />
    </>
  );
}

describe("OverrideMap.clearOverride", () => {
  it("removes the override for the given id", () => {
    const { getByTestId } = render(
      <OverrideMapProvider>
        <Controls setId="slot-a" clearId="slot-a" />
        <Probe targetId="slot-a" />
      </OverrideMapProvider>,
    );

    expect(getByTestId("probe").getAttribute("data-has-override")).toBe(
      "false",
    );

    fireEvent.click(getByTestId("set"));
    expect(getByTestId("probe").getAttribute("data-has-override")).toBe(
      "true",
    );

    fireEvent.click(getByTestId("clear"));
    expect(getByTestId("probe").getAttribute("data-has-override")).toBe(
      "false",
    );
  });

  it("does not affect other overrides", () => {
    function MultiProbe() {
      const { getOverride, setOverride, clearOverride } = useOverrideMap();
      return (
        <>
          <button
            data-testid="set-a"
            onClick={() =>
              setOverride("a", { type: "text", id: "ta", props: {} })
            }
          />
          <button
            data-testid="set-b"
            onClick={() =>
              setOverride("b", { type: "text", id: "tb", props: {} })
            }
          />
          <button
            data-testid="clear-a"
            onClick={() => clearOverride("a")}
          />
          <div data-testid="a">{getOverride("a") ? "A" : "-"}</div>
          <div data-testid="b">{getOverride("b") ? "B" : "-"}</div>
        </>
      );
    }
    const { getByTestId } = render(
      <OverrideMapProvider>
        <MultiProbe />
      </OverrideMapProvider>,
    );
    fireEvent.click(getByTestId("set-a"));
    fireEvent.click(getByTestId("set-b"));
    expect(getByTestId("a").textContent).toBe("A");
    expect(getByTestId("b").textContent).toBe("B");
    fireEvent.click(getByTestId("clear-a"));
    expect(getByTestId("a").textContent).toBe("-");
    expect(getByTestId("b").textContent).toBe("B");
  });

  it("is a no-op when the id is not present", () => {
    function NoopProbe() {
      const { clearOverride, getOverride } = useOverrideMap();
      return (
        <>
          <button
            data-testid="clear"
            onClick={() => clearOverride("not-there")}
          />
          <div data-testid="x">{getOverride("not-there") ? "X" : "-"}</div>
        </>
      );
    }
    const { getByTestId } = render(
      <OverrideMapProvider>
        <NoopProbe />
      </OverrideMapProvider>,
    );
    expect(() => fireEvent.click(getByTestId("clear"))).not.toThrow();
    expect(getByTestId("x").textContent).toBe("-");
  });
});
