import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { OverrideMapProvider } from "@/components/override-map-context";
import { SnackbarProvider } from "@/components/snackbar-provider";
import { ComponentRenderer } from "@/components/renderer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

afterEach(() => cleanup());

function wrap(component: SDUIComponent) {
  return (
    <OverrideMapProvider>
      <SnackbarProvider>
        <ComponentRenderer component={component} />
      </SnackbarProvider>
    </OverrideMapProvider>
  );
}

function textChild(id: string, content: string): SDUIComponent {
  return { type: "text", id, props: { content } };
}

function wizard(
  steps: {
    id: string;
    label: string;
    kind: "info" | "entry" | "summary";
    skippable?: boolean;
    include_default?: boolean;
    children: SDUIComponent[];
  }[],
  extraProps: Record<string, unknown> = {},
): SDUIComponent {
  return {
    type: "wizard",
    id: "w1",
    props: {
      mode: "create",
      title: "Wizard",
      submit_action: { trigger: "click", type: "submit", endpoint: "/x", method: "POST" },
      dismiss_action: { trigger: "click", type: "replace", target_id: "slot", tree: null },
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        skippable: s.skippable ?? s.kind === "entry",
        include_default: s.include_default ?? s.kind !== "entry",
        children: s.children,
      })),
      ...extraProps,
    },
  };
}

describe("Wizard step indicator", () => {
  it("renders 'Step X of Y' counter using 1-based active index", () => {
    const { getByText } = render(
      wrap(
        wizard([
          { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
          { id: "entry", label: "AAPL", kind: "entry", children: [textChild("t2", "S2")] },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t3", "S3")] },
        ]),
      ),
    );
    expect(getByText("Step 1 of 3")).not.toBeNull();
  });

  it("renders one chip per step with the step label", () => {
    const { getByText } = render(
      wrap(
        wizard([
          { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
          { id: "entry", label: "AAPL", kind: "entry", children: [textChild("t2", "S2")] },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t3", "S3")] },
        ]),
      ),
    );
    expect(getByText("Info")).not.toBeNull();
    expect(getByText("AAPL")).not.toBeNull();
    expect(getByText("Summary")).not.toBeNull();
  });

  it("clicking a chip jumps directly to that step (no validation)", () => {
    const { getByText, container } = render(
      wrap(
        wizard([
          { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
          { id: "entry", label: "AAPL", kind: "entry", children: [textChild("t2", "S2")] },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t3", "S3")] },
        ]),
      ),
    );

    expect(getByText("Step 1 of 3")).not.toBeNull();

    fireEvent.click(getByText("Summary"));

    expect(getByText("Step 3 of 3")).not.toBeNull();

    const containers = container.querySelectorAll("[data-step-id]");
    const visibility: Record<string, boolean> = {};
    containers.forEach((el) => {
      visibility[el.getAttribute("data-step-id")!] = !(el as HTMLElement).hidden;
    });
    expect(visibility.info).toBe(false);
    expect(visibility.summary).toBe(true);
  });
});
