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

const baseAction = {
  trigger: "click",
  type: "submit",
  endpoint: "/x",
  method: "POST",
};

const dismissAction = {
  trigger: "click",
  type: "replace",
  target_id: "slot",
  tree: null,
};

function wizard(
  steps: {
    id: string;
    label: string;
    kind: "info" | "entry" | "summary";
    children: SDUIComponent[];
  }[],
  extraProps: Record<string, unknown> = {},
): SDUIComponent {
  return {
    type: "wizard",
    id: "w1",
    props: {
      mode: "create",
      title: "New Snapshot",
      submit_action: baseAction,
      dismiss_action: dismissAction,
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        skippable: s.kind === "entry",
        include_default: s.kind !== "entry",
        children: s.children,
      })),
      ...extraProps,
    },
  };
}

describe("Wizard skeleton", () => {
  it("renders the wizard title", () => {
    const { getByText } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "STEP1")],
          },
        ]),
      ),
    );
    expect(getByText("New Snapshot")).not.toBeNull();
  });

  it("renders the first step's children when no initial_step_id is set", () => {
    const { getByText } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "STEP1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "STEP2")],
          },
        ]),
      ),
    );
    expect(getByText("STEP1")).not.toBeNull();
  });

  it("honors initial_step_id when set", () => {
    const w = wizard(
      [
        {
          id: "info",
          label: "Info",
          kind: "info",
          children: [textChild("t1", "STEP1")],
        },
        {
          id: "summary",
          label: "Summary",
          kind: "summary",
          children: [textChild("t2", "STEP2")],
        },
      ],
      { initial_step_id: "summary" },
    );
    const { container } = render(wrap(w));
    const stepContainers = container.querySelectorAll("[data-step-id]");
    const map: Record<string, boolean> = {};
    stepContainers.forEach((el) => {
      map[el.getAttribute("data-step-id")!] = (el as HTMLElement).hidden;
    });
    expect(map.info).toBe(true);
    expect(map.summary).toBe(false);
  });

  it("mounts ALL steps' children (preserves state across navigation)", () => {
    const { container } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "STEP1")],
          },
          {
            id: "entry",
            label: "AAPL",
            kind: "entry",
            children: [textChild("t2", "STEP2")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t3", "STEP3")],
          },
        ]),
      ),
    );
    expect(container.textContent).toContain("STEP1");
    expect(container.textContent).toContain("STEP2");
    expect(container.textContent).toContain("STEP3");
  });
});

describe("Wizard banner", () => {
  it("does not render a banner when none is provided", () => {
    const { container } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
        ]),
      ),
    );
    expect(container.querySelector("[data-wizard-banner]")).toBeNull();
  });

  it("renders the banner with title + message when present", () => {
    const w = wizard(
      [
        {
          id: "info",
          label: "Info",
          kind: "info",
          children: [textChild("t1", "S1")],
        },
      ],
      {
        banner: {
          variant: "error",
          title: "Validation failed",
          message: "Fix the highlighted fields and retry.",
          dismissible: false,
        },
      },
    );
    const { getByText, container } = render(wrap(w));
    expect(getByText("Validation failed")).not.toBeNull();
    expect(getByText("Fix the highlighted fields and retry.")).not.toBeNull();
    const banner = container.querySelector("[data-wizard-banner]");
    expect(banner?.getAttribute("data-variant")).toBe("error");
  });

  it("dismissible banner can be closed by clicking the X button", () => {
    const w = wizard(
      [
        {
          id: "info",
          label: "Info",
          kind: "info",
          children: [textChild("t1", "S1")],
        },
      ],
      {
        banner: {
          variant: "info",
          message: "Heads up.",
          dismissible: true,
        },
      },
    );
    const { container, queryByText } = render(wrap(w));
    expect(queryByText("Heads up.")).not.toBeNull();
    const closeBtn = container.querySelector(
      "[data-wizard-banner-close]",
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn);
    expect(queryByText("Heads up.")).toBeNull();
  });
});
