import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  TableColumnsProvider,
  useTableColumns,
} from "@/components/table-columns-context";

afterEach(() => cleanup());

function Probe() {
  const value = useTableColumns();
  return (
    <div
      data-testid="probe"
      data-cols={value.columns.length}
      data-chevron={String(value.hasChevronColumn)}
    />
  );
}

describe("TableColumnsProvider", () => {
  it("exposes columns and hasChevronColumn=false by default", () => {
    const { getByTestId } = render(
      <TableColumnsProvider
        columns={[{ id: "a", header: "A" }]}
        hasChevronColumn={false}
      >
        <Probe />
      </TableColumnsProvider>,
    );
    const probe = getByTestId("probe");
    expect(probe.getAttribute("data-cols")).toBe("1");
    expect(probe.getAttribute("data-chevron")).toBe("false");
  });

  it("exposes hasChevronColumn=true when provided", () => {
    const { getByTestId } = render(
      <TableColumnsProvider columns={[]} hasChevronColumn={true}>
        <Probe />
      </TableColumnsProvider>,
    );
    expect(getByTestId("probe").getAttribute("data-chevron")).toBe("true");
  });

  it("returns empty columns and hasChevronColumn=false outside any provider", () => {
    const { getByTestId } = render(<Probe />);
    const probe = getByTestId("probe");
    expect(probe.getAttribute("data-cols")).toBe("0");
    expect(probe.getAttribute("data-chevron")).toBe("false");
  });
});
