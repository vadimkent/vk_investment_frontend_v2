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

describe("Wizard button row", () => {
  it("info step shows Dismiss + Next", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard([
          { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t2", "S2")] },
        ]),
      ),
    );
    expect(getByText("Next")).not.toBeNull();
    expect(getByText("Dismiss")).not.toBeNull();
    expect(queryByText("Back")).toBeNull();
    expect(queryByText("Skip")).toBeNull();
    expect(queryByText("Include")).toBeNull();
    expect(queryByText("Update")).toBeNull();
    expect(queryByText("Submit")).toBeNull();
  });

  it("entry step with skippable=true shows Dismiss + Back + Skip + Include", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard(
          [
            { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
            {
              id: "entry",
              label: "AAPL",
              kind: "entry",
              skippable: true,
              children: [textChild("t2", "S2")],
            },
          ],
          { initial_step_id: "entry" },
        ),
      ),
    );
    expect(getByText("Back")).not.toBeNull();
    expect(getByText("Skip")).not.toBeNull();
    expect(getByText("Include")).not.toBeNull();
    expect(queryByText("Update")).toBeNull();
    expect(queryByText("Next")).toBeNull();
  });

  it("entry step with skippable=false shows Dismiss + Back + Update", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard(
          [
            { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
            {
              id: "entry",
              label: "AAPL",
              kind: "entry",
              skippable: false,
              include_default: true,
              children: [textChild("t2", "S2")],
            },
          ],
          { initial_step_id: "entry" },
        ),
      ),
    );
    expect(getByText("Back")).not.toBeNull();
    expect(getByText("Update")).not.toBeNull();
    expect(queryByText("Skip")).toBeNull();
    expect(queryByText("Include")).toBeNull();
  });

  it("summary step shows Dismiss + Back + Submit", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard(
          [
            { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
            { id: "summary", label: "Summary", kind: "summary", children: [textChild("t2", "S2")] },
          ],
          { initial_step_id: "summary" },
        ),
      ),
    );
    expect(getByText("Back")).not.toBeNull();
    expect(getByText("Submit")).not.toBeNull();
    expect(queryByText("Next")).toBeNull();
  });

  it("clicking Back returns to the previous step (no validation)", () => {
    const { getByText } = render(
      wrap(
        wizard(
          [
            { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
            { id: "summary", label: "Summary", kind: "summary", children: [textChild("t2", "S2")] },
          ],
          { initial_step_id: "summary" },
        ),
      ),
    );
    expect(getByText("Step 2 of 2")).not.toBeNull();
    fireEvent.click(getByText("Back"));
    expect(getByText("Step 1 of 2")).not.toBeNull();
  });

  it("clicking Next on info advances without validation when no required fields are present", () => {
    const { getByText } = render(
      wrap(
        wizard([
          { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t2", "S2")] },
        ]),
      ),
    );
    expect(getByText("Step 1 of 2")).not.toBeNull();
    fireEvent.click(getByText("Next"));
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });
});

function inputChild(id: string, name: string, opts: Record<string, unknown> = {}): SDUIComponent {
  return {
    type: "input",
    id,
    props: { name, ...opts },
  };
}

describe("Wizard validation gate", () => {
  it("Next does NOT advance when active step has an invalid required input", () => {
    const { getByText, container } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [inputChild("i1", "field_required", { required: true, label: "Field" })],
          },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t1", "S2")] },
        ]),
      ),
    );

    expect(getByText("Step 1 of 2")).not.toBeNull();
    fireEvent.click(getByText("Next"));
    expect(getByText("Step 1 of 2")).not.toBeNull();
    const input = container.querySelector("input[name=field_required]") as HTMLInputElement;
    expect(input.validity.valid).toBe(false);
  });

  it("Next advances when the required input is filled", () => {
    const { getByText, container } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [inputChild("i1", "field_required", { required: true, label: "Field" })],
          },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t1", "S2")] },
        ]),
      ),
    );
    const input = container.querySelector("input[name=field_required]") as HTMLInputElement;
    input.value = "hello";
    fireEvent.input(input);
    fireEvent.click(getByText("Next"));
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });

  it("Back never validates — works even with invalid fields on the active step", () => {
    const { getByText } = render(
      wrap(
        wizard(
          [
            { id: "info", label: "Info", kind: "info", children: [textChild("t1", "S1")] },
            {
              id: "entry",
              label: "Bad",
              kind: "entry",
              skippable: true,
              children: [inputChild("i1", "needed", { required: true })],
            },
          ],
          { initial_step_id: "entry" },
        ),
      ),
    );
    expect(getByText("Step 2 of 2")).not.toBeNull();
    fireEvent.click(getByText("Back"));
    expect(getByText("Step 1 of 2")).not.toBeNull();
  });

  it("chip-jump never validates", () => {
    const { getByText } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [inputChild("i1", "required_field", { required: true })],
          },
          { id: "summary", label: "Summary", kind: "summary", children: [textChild("t1", "S2")] },
        ]),
      ),
    );
    fireEvent.click(getByText("Summary"));
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });
});
