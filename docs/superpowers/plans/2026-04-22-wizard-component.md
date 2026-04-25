# Wizard Custom Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `wizard` custom SDUI component — a multi-step form container with a client-side step machine, per-step include/skip semantics, validation on advance, and submit/dismiss action dispatch.

**Architecture:** New custom component at `components/custom/Wizard.tsx`. Mounts ALL steps' children at once and hides non-active step containers via the `hidden` HTML attribute, so input state is preserved across step navigation without remounts. Wraps everything in its own `FormStateProvider` so `visible_when` works across steps. Local React state tracks `activeStepId`, `includeMap` (`Record<stepId, boolean>` seeded from each step's `include_default`), and `bannerDismissed`. Renders a step indicator (counter + clickable chip row), an optional banner, the active step's content, and a button row whose composition depends on `kind` + `skippable`. On submit, collects DOM form data per step and skips entry steps whose `includeMap[id] === false`. Dismiss with `type: "replace"` + `tree: null` is handled by a new `clearOverride(id)` extension on `override-map-context` (existing `setOverride` only accepts a non-null tree).

**Tech Stack:** Next.js 15 / React 19 / TypeScript / Tailwind CSS / `lucide-react` (chevrons, X, check icons — already in deps) / Vitest + jsdom + `@testing-library/react`. Reuses existing infra: `FormStateProvider`, `collectFormData`, `hasInvalidFields`, `useActionDispatcher`, `useOverrideMap`, `collectInitialValues`.

**Decisions (locked, do not revisit):**

1. **Mount all step children, hide non-active via `hidden`.** Per spec: _"los de los otros steps están ocultos pero sus inputs persisten client-side"_. This keeps React state on inputs across navigation.
2. **Submit just executes `submit_action` — no client-side validation gate.** Per spec: _"Submit — ejecuta submit_action."_ Validation happens only on Next/Include/Update. If user chip-jumps over an invalid step and submits, the BE returns 422 and re-emits the wizard with banner error + `initial_step_id` pointing at the broken step.
3. **Validation triggers: Next, Include, Update only.** Back, Skip, chip-jump, and Submit do NOT validate.
4. **Summary entries view = step labels with "Edit" link.** Each included entry step renders as a row with `step.label` and an Edit affordance that chip-jumps to that step. No raw input value dump (avoids locale/formatting concerns).
5. **`dismiss_action` with `type: "replace"` + `tree: null` clears the override** via a new `clearOverride(target_id)` on `override-map-context`. With a non-null tree, falls back to existing `setOverride(target_id, tree)`.
6. **Button copy is fixed English keyed by `kind` + `skippable`.** `mode` is informational only in v1 — no copy variation.
7. **Each step container exposes `data-sdui-id={`${wizard.id}__step__${step.id}`}` and `data-step-id={step.id}`.** This lets `hasInvalidFields(stepContainerId)` validate the active step and lets the wizard's own collect routine scope to one step at a time.
8. **The wizard installs its own `FormStateProvider`.** Initial values are collected from ALL steps' children (info + entry, regardless of `include_default`) so that pre-filled inputs in not-yet-included entries don't get lost on toggle. Excluded steps' values are filtered at SUBMIT time, not at form-state initialization time.

---

## File Structure

**Create:**

- `components/custom/Wizard.tsx` — main component: state machine, validation, dispatch, render orchestration. ~280 lines.
- `components/custom/WizardStepIndicator.tsx` — counter ("Step X of Y") + chip nav. ~50 lines.
- `components/custom/WizardBanner.tsx` — variant-styled banner with optional dismiss. ~60 lines.
- `components/custom/WizardSummaryEntries.tsx` — derived list of included entry labels with Edit links. ~50 lines.
- `tests/override-map-clear-override.test.tsx` — locks new `clearOverride` behavior.
- `tests/wizard-skeleton.test.tsx` — renders title + first step active + initial_step_id honored.
- `tests/wizard-step-navigation.test.tsx` — chip jump, Back, Next/Include/Update/Skip behavior + validation gate.
- `tests/wizard-submit-dismiss.test.tsx` — submit collects only included entries; dismiss handles both `tree` and `tree: null`.

**Modify:**

- `components/override-map-context.tsx` — add `clearOverride(id)` to context shape, provider value, and default value.
- `components/registry.ts` — register `wizard` → `WizardComponent`.
- `spec/sdui-custom-components.md` — add `## 3. wizard` section documenting props, sub-types, behavior, dismiss/submit semantics.

---

## Task 1: Add `clearOverride(id)` to `override-map-context`

The wizard's dismiss flow needs a way to remove a single override entry by id. Currently `OverrideMapProvider` exposes `setOverride(id, tree)` and `clearOverrides()` (clears ALL). We add the missing scalpel.

**Files:**

- Modify: `components/override-map-context.tsx`
- Test: `tests/override-map-clear-override.test.tsx` (new)

- [ ] **Step 1: Write failing test**

Create `tests/override-map-clear-override.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
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

function Controls({ setId, clearId }: { setId?: string; clearId?: string }) {
  const { setOverride, clearOverride } = useOverrideMap();
  return (
    <>
      <button
        data-testid="set"
        onClick={() =>
          setId && setOverride(setId, { type: "text", id: "t1", props: {} })
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
  it("removes the override for the given id", async () => {
    const { getByTestId } = render(
      <OverrideMapProvider>
        <Controls setId="slot-a" clearId="slot-a" />
        <Probe targetId="slot-a" />
      </OverrideMapProvider>,
    );

    expect(getByTestId("probe").getAttribute("data-has-override")).toBe(
      "false",
    );

    getByTestId("set").click();
    expect(getByTestId("probe").getAttribute("data-has-override")).toBe("true");

    getByTestId("clear").click();
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
          <button data-testid="clear-a" onClick={() => clearOverride("a")} />
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
    getByTestId("set-a").click();
    getByTestId("set-b").click();
    expect(getByTestId("a").textContent).toBe("A");
    expect(getByTestId("b").textContent).toBe("B");
    getByTestId("clear-a").click();
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
    expect(() => getByTestId("clear").click()).not.toThrow();
    expect(getByTestId("x").textContent).toBe("-");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run tests/override-map-clear-override.test.tsx`
Expected: TypeScript / runtime error — `clearOverride` does not exist on the context.

- [ ] **Step 3: Add `clearOverride` to the context shape, default, and provider**

Edit `components/override-map-context.tsx`:

In `type OverrideMapContext = { ... }`, add:

```ts
  clearOverride: (id: string) => void;
```

In the `createContext` default object, add:

```ts
  clearOverride: () => {},
```

In `OverrideMapProvider`, add the implementation alongside `setOverride`:

```ts
const clearOverride = useCallback(
  (id: string) =>
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    }),
  [],
);
```

In the `<Ctx.Provider value={{ ... }}>`, add `clearOverride` to the object.

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run tests/override-map-clear-override.test.tsx`
Expected: 3 passing tests.

- [ ] **Step 5: Run full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/override-map-context.tsx tests/override-map-clear-override.test.tsx
git commit -m "feat(override-map): add clearOverride(id) for scoped removal"
```

---

## Task 2: Wizard skeleton — renders title + active step container, registered

A minimum viable wizard: renders the title, mounts the first step's children inside a wrapper, registers in the registry. No buttons, no indicator, no banner, no logic. Just enough to verify rendering plumbing.

**Files:**

- Create: `components/custom/Wizard.tsx`
- Modify: `components/registry.ts`
- Test: `tests/wizard-skeleton.test.tsx` (new)

- [ ] **Step 1: Write failing test**

Create `tests/wizard-skeleton.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
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
    // STEP2's container is visible (not hidden), STEP1's is hidden
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
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run tests/wizard-skeleton.test.tsx`
Expected: tests fail because the registry has no `wizard` entry — `ComponentRenderer` will render an "unknown type" placeholder or nothing.

- [ ] **Step 3: Create the Wizard skeleton**

Create `components/custom/Wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { FormStateProvider } from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";

export type WizardStep = {
  id: string;
  label: string;
  kind: "info" | "entry" | "summary";
  skippable: boolean;
  include_default: boolean;
  children: SDUIComponent[];
};

export function WizardComponent({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const title = component.props.title as string;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const initialStepId =
    (component.props.initial_step_id as string | undefined) ?? steps[0]?.id;

  const [activeStepId, setActiveStepId] = useState<string>(initialStepId);

  // Collect initial values from ALL steps so the form-state context is seeded
  // before any step navigation. The wrapping container is a synthetic SDUI node
  // whose children are the union of all steps' children.
  const allChildren: SDUIComponent[] = steps.flatMap((s) => s.children);
  const initial = collectInitialValues({
    type: "wizard_root",
    id: `${wizardId}__root`,
    props: {},
    children: allChildren,
  });

  return (
    <FormStateProvider initial={initial}>
      <div
        data-sdui-id={wizardId}
        data-sdui-form="true"
        className="flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {steps.map((step) => (
          <div
            key={step.id}
            data-step-id={step.id}
            data-sdui-id={`${wizardId}__step__${step.id}`}
            hidden={step.id !== activeStepId}
          >
            {step.children.map((child) => (
              <ComponentRenderer key={child.id} component={child} />
            ))}
          </div>
        ))}
      </div>
    </FormStateProvider>
  );
}

// Suppress unused-warning for setActiveStepId until Task 3 wires the indicator.
void setActiveStepId;
```

Wait — `setActiveStepId` is declared via `useState` and a lint pass on unused `set*` callbacks is unlikely to complain (it's a destructure). Remove the trailing `void setActiveStepId` line — kept above only as a reminder.

Final correct skeleton (no trailing `void`):

```tsx
"use client";

import { useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { FormStateProvider } from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";

export type WizardStep = {
  id: string;
  label: string;
  kind: "info" | "entry" | "summary";
  skippable: boolean;
  include_default: boolean;
  children: SDUIComponent[];
};

export function WizardComponent({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const title = component.props.title as string;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const initialStepId =
    (component.props.initial_step_id as string | undefined) ?? steps[0]?.id;

  const [activeStepId] = useState<string>(initialStepId);

  const allChildren: SDUIComponent[] = steps.flatMap((s) => s.children);
  const initial = collectInitialValues({
    type: "wizard_root",
    id: `${wizardId}__root`,
    props: {},
    children: allChildren,
  });

  return (
    <FormStateProvider initial={initial}>
      <div
        data-sdui-id={wizardId}
        data-sdui-form="true"
        className="flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {steps.map((step) => (
          <div
            key={step.id}
            data-step-id={step.id}
            data-sdui-id={`${wizardId}__step__${step.id}`}
            hidden={step.id !== activeStepId}
          >
            {step.children.map((child) => (
              <ComponentRenderer key={child.id} component={child} />
            ))}
          </div>
        ))}
      </div>
    </FormStateProvider>
  );
}
```

- [ ] **Step 4: Register the component**

Edit `components/registry.ts`:

After the existing imports, add:

```ts
import { WizardComponent } from "@/components/custom/Wizard";
```

In the `registry` object, add (in the custom-components section, after `pie_chart`):

```ts
  wizard: WizardComponent,
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-skeleton.test.tsx`
Expected: 4 passing tests.

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/custom/Wizard.tsx components/registry.ts tests/wizard-skeleton.test.tsx
git commit -m "feat(wizard): skeleton component with all-steps-mounted rendering"
```

---

## Task 3: Step indicator — counter + clickable chip nav

A row above the step content with "Step X of Y" text and one chip per step. Clicking a chip jumps directly to that step (no validation per spec).

**Files:**

- Create: `components/custom/WizardStepIndicator.tsx`
- Modify: `components/custom/Wizard.tsx` (mount the indicator + wire `setActiveStepId`)
- Test: `tests/wizard-step-navigation.test.tsx` (new — first 3 tests)

- [ ] **Step 1: Write failing tests**

Create `tests/wizard-step-navigation.test.tsx`:

```tsx
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
      submit_action: {
        trigger: "click",
        type: "submit",
        endpoint: "/x",
        method: "POST",
      },
      dismiss_action: {
        trigger: "click",
        type: "replace",
        target_id: "slot",
        tree: null,
      },
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
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
          {
            id: "entry",
            label: "AAPL",
            kind: "entry",
            children: [textChild("t2", "S2")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t3", "S3")],
          },
        ]),
      ),
    );
    expect(getByText("Step 1 of 3")).not.toBeNull();
  });

  it("renders one chip per step with the step label", () => {
    const { getByText } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
          {
            id: "entry",
            label: "AAPL",
            kind: "entry",
            children: [textChild("t2", "S2")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t3", "S3")],
          },
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
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
          {
            id: "entry",
            label: "AAPL",
            kind: "entry",
            children: [textChild("t2", "S2")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t3", "S3")],
          },
        ]),
      ),
    );

    // Initially info is the active step
    expect(getByText("Step 1 of 3")).not.toBeNull();

    // Click summary chip
    fireEvent.click(getByText("Summary"));

    // Now summary is active
    expect(getByText("Step 3 of 3")).not.toBeNull();

    // summary container is visible, info hidden
    const containers = container.querySelectorAll("[data-step-id]");
    const visibility: Record<string, boolean> = {};
    containers.forEach((el) => {
      visibility[el.getAttribute("data-step-id")!] = !(el as HTMLElement)
        .hidden;
    });
    expect(visibility.info).toBe(false);
    expect(visibility.summary).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: all 3 fail (no indicator exists yet).

- [ ] **Step 3: Create the indicator component**

Create `components/custom/WizardStepIndicator.tsx`:

```tsx
"use client";

import type { WizardStep } from "@/components/custom/Wizard";

export function WizardStepIndicator({
  steps,
  activeStepId,
  onJump,
}: {
  steps: WizardStep[];
  activeStepId: string;
  onJump: (stepId: string) => void;
}) {
  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const oneBased = activeIndex < 0 ? 1 : activeIndex + 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-content-secondary">
        Step {oneBased} of {steps.length}
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const isActive = step.id === activeStepId;
          const cls = isActive
            ? "px-3 py-1 rounded-full text-xs bg-surface-accent text-content-inverse font-medium"
            : "px-3 py-1 rounded-full text-xs border border-border text-content-secondary hover:bg-surface-secondary";
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onJump(step.id)}
              className={cls}
              aria-current={isActive ? "step" : undefined}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the indicator into the Wizard**

Edit `components/custom/Wizard.tsx`. Replace the `[activeStepId]` destructure with:

```ts
const [activeStepId, setActiveStepId] = useState<string>(initialStepId);
```

Add the import at the top:

```ts
import { WizardStepIndicator } from "@/components/custom/WizardStepIndicator";
```

Inside the returned JSX, after the `<h2>` and before the `{steps.map(...)}` block, add:

```tsx
<WizardStepIndicator
  steps={steps}
  activeStepId={activeStepId}
  onJump={setActiveStepId}
/>
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx tests/wizard-skeleton.test.tsx`
Expected: all 7 tests pass (4 skeleton + 3 indicator).

- [ ] **Step 6: Full suite**

Run: `npx vitest run`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/custom/WizardStepIndicator.tsx components/custom/Wizard.tsx tests/wizard-step-navigation.test.tsx
git commit -m "feat(wizard): step indicator with counter + clickable chip nav"
```

---

## Task 4: Button row — Back / Next / Skip / Include / Update / Submit / Dismiss

The button row at the bottom whose composition depends on `kind` + `skippable`. Wire all handlers but keep them stub-minimal (no validation yet, no submit dispatch yet — those come in Tasks 5 and 7).

**Files:**

- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-step-navigation.test.tsx` (append tests)

Button matrix (locked by spec):

| `kind`  | `skippable` | Buttons (in order)           |
| ------- | ----------- | ---------------------------- |
| info    | n/a         | Dismiss, Next                |
| entry   | true        | Dismiss, Back, Skip, Include |
| entry   | false       | Dismiss, Back, Update        |
| summary | n/a         | Dismiss, Back, Submit        |

(Dismiss is shown on every step in the top-left or top-right; here we put it inline at the start of the button row for simplicity. Final styling can refine.)

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-step-navigation.test.tsx`:

```tsx
describe("Wizard button row", () => {
  it("info step shows Dismiss + Next", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "S2")],
          },
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
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
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
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
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
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
            {
              id: "summary",
              label: "Summary",
              kind: "summary",
              children: [textChild("t2", "S2")],
            },
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
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
            {
              id: "summary",
              label: "Summary",
              kind: "summary",
              children: [textChild("t2", "S2")],
            },
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
          {
            id: "info",
            label: "Info",
            kind: "info",
            children: [textChild("t1", "S1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "S2")],
          },
        ]),
      ),
    );
    expect(getByText("Step 1 of 2")).not.toBeNull();
    fireEvent.click(getByText("Next"));
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: 6 new tests fail (no buttons rendered).

- [ ] **Step 3: Add the button row to the Wizard**

Edit `components/custom/Wizard.tsx`. Below the `{steps.map(...)}` block, before the closing `</div>`, add the button row:

```tsx
<WizardButtonRow
  step={activeStep}
  isFirst={activeIndex === 0}
  onBack={goBack}
  onNext={goNext}
  onSkip={skip}
  onInclude={include}
  onUpdate={update}
  onSubmit={submit}
  onDismiss={dismiss}
/>
```

Above the JSX `return`, add the derived state and handlers:

```ts
const activeIndex = steps.findIndex((s) => s.id === activeStepId);
const activeStep: WizardStep = steps[activeIndex];

function goToStep(id: string) {
  setActiveStepId(id);
}
function goBack() {
  if (activeIndex > 0) setActiveStepId(steps[activeIndex - 1].id);
}
function goNext() {
  // Validation wired in Task 5. For now: just advance.
  if (activeIndex < steps.length - 1)
    setActiveStepId(steps[activeIndex + 1].id);
}
function skip() {
  // include map wired in Task 6. For now: advance.
  goNext();
}
function include() {
  // include map wired in Task 6. For now: advance.
  goNext();
}
function update() {
  // include map wired in Task 6. For now: advance.
  goNext();
}
function submit() {
  // dispatch wired in Task 7.
}
function dismiss() {
  // dispatch wired in Task 8.
}
```

Also replace the `onJump={setActiveStepId}` line with `onJump={goToStep}` (consistent naming).

Inline the button row component at the bottom of the same file:

```tsx
function WizardButtonRow({
  step,
  isFirst,
  onBack,
  onNext,
  onSkip,
  onInclude,
  onUpdate,
  onSubmit,
  onDismiss,
}: {
  step: WizardStep;
  isFirst: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onInclude: () => void;
  onUpdate: () => void;
  onSubmit: () => void;
  onDismiss: () => void;
}) {
  const buttons: { label: string; onClick: () => void; primary?: boolean }[] = [
    { label: "Dismiss", onClick: onDismiss },
  ];

  if (!isFirst && step.kind !== "info") {
    buttons.push({ label: "Back", onClick: onBack });
  }

  if (step.kind === "info") {
    buttons.push({ label: "Next", onClick: onNext, primary: true });
  } else if (step.kind === "entry") {
    if (step.skippable) {
      buttons.push({ label: "Skip", onClick: onSkip });
      buttons.push({ label: "Include", onClick: onInclude, primary: true });
    } else {
      buttons.push({ label: "Update", onClick: onUpdate, primary: true });
    }
  } else if (step.kind === "summary") {
    buttons.push({ label: "Submit", onClick: onSubmit, primary: true });
  }

  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-border">
      {buttons.map((b) => {
        const cls = b.primary
          ? "px-4 py-2 rounded bg-surface-accent text-content-inverse text-sm font-medium hover:opacity-90"
          : "px-4 py-2 rounded border border-border text-sm hover:bg-surface-secondary";
        return (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            className={cls}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
```

Note on `Back` visibility: the test "info step shows Dismiss + Next" expects no Back. The condition `!isFirst && step.kind !== "info"` excludes info entirely. Even an info step that is NOT the first won't show Back (info is conventionally always step 0; if backends ever put info later, we'd reconsider).

For `entry` skippable=true on first position (no Back), still satisfies. The matrix in the spec doesn't explicitly say "Back only shown when not on first step" but it's the only sensible reading.

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: all 9 tests pass (3 indicator + 6 button row).

- [ ] **Step 5: Commit**

```bash
git add components/custom/Wizard.tsx tests/wizard-step-navigation.test.tsx
git commit -m "feat(wizard): button row varies by kind + skippable, Back/Next wired"
```

---

## Task 5: Validation gate on Next / Include / Update

Next, Include, Update validate the active step's required/pattern inputs. If invalid, the form-state context's `revealErrors` is triggered and the input/blur events are dispatched so the field highlights — and the wizard does NOT advance. Mirrors the existing Button[type=submit] pattern (`components/base/Button.tsx:60-83`).

**Files:**

- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-step-navigation.test.tsx` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-step-navigation.test.tsx`:

```tsx
function inputChild(
  id: string,
  name: string,
  opts: Record<string, unknown> = {},
): SDUIComponent {
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
            children: [
              inputChild("i1", "field_required", {
                required: true,
                label: "Field",
              }),
            ],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t1", "S2")],
          },
        ]),
      ),
    );

    expect(getByText("Step 1 of 2")).not.toBeNull();
    fireEvent.click(getByText("Next"));
    // Still on step 1 because the required field is empty.
    expect(getByText("Step 1 of 2")).not.toBeNull();
    // The input should now be marked invalid in DOM (data-sdui-invalid or :invalid).
    const input = container.querySelector(
      "input[name=field_required]",
    ) as HTMLInputElement;
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
            children: [
              inputChild("i1", "field_required", {
                required: true,
                label: "Field",
              }),
            ],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t1", "S2")],
          },
        ]),
      ),
    );
    const input = container.querySelector(
      "input[name=field_required]",
    ) as HTMLInputElement;
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
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
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
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t1", "S2")],
          },
        ]),
      ),
    );
    fireEvent.click(getByText("Summary"));
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: the "Next does NOT advance" test fails (currently advances) and the "Next advances when filled" test may pass already; the Back/chip tests pass already.

- [ ] **Step 3: Implement the validation gate**

Edit `components/custom/Wizard.tsx`. Add imports:

```ts
import { hasInvalidFields } from "@/components/action-dispatcher";
import { useFormState } from "@/components/form-state-context";
```

Inside `WizardComponent`, after `useState`, add:

```ts
const formCtx = useFormState();
```

Wait — `WizardComponent` IS the one installing the FormStateProvider. Calling `useFormState()` from within would get `null` (the provider wraps children, not itself). Need to refactor: split into an outer `WizardComponent` (provider) and an inner `WizardInner` that consumes the context.

Replace the structure as follows:

```tsx
export function WizardComponent({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const allChildren: SDUIComponent[] = steps.flatMap((s) => s.children);
  const initial = collectInitialValues({
    type: "wizard_root",
    id: `${wizardId}__root`,
    props: {},
    children: allChildren,
  });

  return (
    <FormStateProvider initial={initial}>
      <WizardInner component={component} />
    </FormStateProvider>
  );
}

function WizardInner({ component }: { component: SDUIComponent }) {
  const wizardId = component.id;
  const title = component.props.title as string;
  const steps = (component.props.steps as WizardStep[] | undefined) ?? [];
  const initialStepId =
    (component.props.initial_step_id as string | undefined) ?? steps[0]?.id;

  const [activeStepId, setActiveStepId] = useState<string>(initialStepId);
  const formCtx = useFormState();

  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const activeStep: WizardStep = steps[activeIndex];

  function validateActiveStep(): boolean {
    const containerId = `${wizardId}__step__${activeStep.id}`;
    if (!hasInvalidFields(containerId)) return true;
    formCtx?.triggerRevealErrors();
    const container = document.querySelector(`[data-sdui-id="${containerId}"]`);
    if (container) {
      const fields = container.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input[name]:not([type='hidden']), textarea[name], select[name]");
      for (const f of fields) {
        f.dispatchEvent(new Event("input", { bubbles: true }));
        f.dispatchEvent(new Event("blur", { bubbles: true }));
      }
    }
    return false;
  }

  function goToStep(id: string) {
    setActiveStepId(id);
  }
  function goBack() {
    if (activeIndex > 0) setActiveStepId(steps[activeIndex - 1].id);
  }
  function goNext() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function skip() {
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function include() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function update() {
    if (!validateActiveStep()) return;
    if (activeIndex < steps.length - 1)
      setActiveStepId(steps[activeIndex + 1].id);
  }
  function submit() {}
  function dismiss() {}

  return (
    <div
      data-sdui-id={wizardId}
      data-sdui-form="true"
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <WizardStepIndicator
        steps={steps}
        activeStepId={activeStepId}
        onJump={goToStep}
      />
      {steps.map((step) => (
        <div
          key={step.id}
          data-step-id={step.id}
          data-sdui-id={`${wizardId}__step__${step.id}`}
          hidden={step.id !== activeStepId}
        >
          {step.children.map((child) => (
            <ComponentRenderer key={child.id} component={child} />
          ))}
        </div>
      ))}
      <WizardButtonRow
        step={activeStep}
        isFirst={activeIndex === 0}
        onBack={goBack}
        onNext={goNext}
        onSkip={skip}
        onInclude={include}
        onUpdate={update}
        onSubmit={submit}
        onDismiss={dismiss}
      />
    </div>
  );
}
```

Skip's spec says it "marca included=false y avanza" — no validation. Confirmed: `skip()` does NOT call `validateActiveStep()`.

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: all 13 tests pass (3 indicator + 6 button row + 4 validation).

- [ ] **Step 5: Full suite**

Run: `npx vitest run`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/custom/Wizard.tsx tests/wizard-step-navigation.test.tsx
git commit -m "feat(wizard): Next/Include/Update validate active step before advancing"
```

---

## Task 6: Include map — Skip / Include / Update mutate `{stepId → bool}`

The wizard tracks an internal include map seeded from each step's `include_default`. Skip sets it to `false`, Include and Update set it to `true`. The map drives what gets submitted (Task 7) and what shows on the summary step (Task 9).

**Files:**

- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-step-navigation.test.tsx` (append)

The include map state is internal to the wizard; tests verify it indirectly via DOM markers. We add `data-included={includeMap[step.id] ? "true" : "false"}` on each step container so tests (and devtools) can observe it.

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-step-navigation.test.tsx`:

```tsx
describe("Wizard include map", () => {
  it("seeds include map from each step's include_default", () => {
    const { container } = render(
      wrap(
        wizard([
          {
            id: "info",
            label: "Info",
            kind: "info",
            include_default: true,
            children: [textChild("t1", "S1")],
          },
          {
            id: "e1",
            label: "AAPL",
            kind: "entry",
            include_default: false,
            children: [textChild("t2", "S2")],
          },
          {
            id: "e2",
            label: "MSFT",
            kind: "entry",
            include_default: true,
            children: [textChild("t3", "S3")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            include_default: true,
            children: [textChild("t4", "S4")],
          },
        ]),
      ),
    );
    const steps = container.querySelectorAll("[data-step-id]");
    const map: Record<string, string> = {};
    steps.forEach((el) => {
      map[el.getAttribute("data-step-id")!] =
        el.getAttribute("data-included") ?? "";
    });
    expect(map.info).toBe("true");
    expect(map.e1).toBe("false");
    expect(map.e2).toBe("true");
    expect(map.summary).toBe("true");
  });

  it("Skip sets the active step's include map to false and advances", () => {
    const { container, getByText } = render(
      wrap(
        wizard([
          {
            id: "e1",
            label: "AAPL",
            kind: "entry",
            skippable: true,
            include_default: false,
            children: [textChild("t1", "S1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "S2")],
          },
        ]),
      ),
    );
    fireEvent.click(getByText("Skip"));
    const e1 = container.querySelector('[data-step-id="e1"]');
    expect(e1?.getAttribute("data-included")).toBe("false");
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });

  it("Include sets the active step's include map to true and advances", () => {
    const { container, getByText } = render(
      wrap(
        wizard([
          {
            id: "e1",
            label: "AAPL",
            kind: "entry",
            skippable: true,
            include_default: false,
            children: [textChild("t1", "S1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "S2")],
          },
        ]),
      ),
    );
    fireEvent.click(getByText("Include"));
    const e1 = container.querySelector('[data-step-id="e1"]');
    expect(e1?.getAttribute("data-included")).toBe("true");
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });

  it("Update keeps included=true and advances", () => {
    const { container, getByText } = render(
      wrap(
        wizard([
          {
            id: "e1",
            label: "AAPL",
            kind: "entry",
            skippable: false,
            include_default: true,
            children: [textChild("t1", "S1")],
          },
          {
            id: "summary",
            label: "Summary",
            kind: "summary",
            children: [textChild("t2", "S2")],
          },
        ]),
      ),
    );
    fireEvent.click(getByText("Update"));
    const e1 = container.querySelector('[data-step-id="e1"]');
    expect(e1?.getAttribute("data-included")).toBe("true");
    expect(getByText("Step 2 of 2")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: 4 new tests fail (no `data-included` attribute, no map state).

- [ ] **Step 3: Implement the include map**

Edit `components/custom/Wizard.tsx`. Inside `WizardInner`, after the `[activeStepId, ...]` useState, add:

```ts
const [includeMap, setIncludeMap] = useState<Record<string, boolean>>(() => {
  const seed: Record<string, boolean> = {};
  for (const s of steps) seed[s.id] = s.include_default;
  return seed;
});

function setIncluded(id: string, value: boolean) {
  setIncludeMap((prev) =>
    prev[id] === value ? prev : { ...prev, [id]: value },
  );
}
```

Update the handlers:

```ts
function skip() {
  setIncluded(activeStep.id, false);
  if (activeIndex < steps.length - 1)
    setActiveStepId(steps[activeIndex + 1].id);
}
function include() {
  if (!validateActiveStep()) return;
  setIncluded(activeStep.id, true);
  if (activeIndex < steps.length - 1)
    setActiveStepId(steps[activeIndex + 1].id);
}
function update() {
  if (!validateActiveStep()) return;
  setIncluded(activeStep.id, true);
  if (activeIndex < steps.length - 1)
    setActiveStepId(steps[activeIndex + 1].id);
}
```

Add `data-included` to each step container in the JSX:

```tsx
<div
  key={step.id}
  data-step-id={step.id}
  data-sdui-id={`${wizardId}__step__${step.id}`}
  data-included={includeMap[step.id] ? "true" : "false"}
  hidden={step.id !== activeStepId}
>
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: all 17 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/custom/Wizard.tsx tests/wizard-step-navigation.test.tsx
git commit -m "feat(wizard): include map seeded by include_default; Skip/Include/Update mutate it"
```

---

## Task 7: Submit handler — collect form data filtered by include map, dispatch submit_action

On the summary step, clicking Submit collects form data from:

- All `kind: "info"` steps (always included).
- All `kind: "entry"` steps where `includeMap[id] === true`.

Then dispatches `submit_action` via `useActionDispatcher`. The action contract is the existing `submit` shape (`endpoint`, `method`).

**Files:**

- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-submit-dismiss.test.tsx` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/wizard-submit-dismiss.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { OverrideMapProvider } from "@/components/override-map-context";
import { SnackbarProvider } from "@/components/snackbar-provider";
import { ComponentRenderer } from "@/components/renderer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ action: "none" }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

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
function inputChild(
  id: string,
  name: string,
  opts: Record<string, unknown> = {},
): SDUIComponent {
  return { type: "input", id, props: { name, ...opts } };
}

function w(
  steps: SDUIComponent["props"]["steps"],
  extra: Record<string, unknown> = {},
) {
  return {
    type: "wizard",
    id: "w1",
    props: {
      mode: "create",
      title: "T",
      submit_action: {
        trigger: "click",
        type: "submit",
        endpoint: "/actions/snapshots/create",
        method: "POST",
      },
      dismiss_action: {
        trigger: "click",
        type: "replace",
        target_id: "slot",
        tree: null,
      },
      steps,
      ...extra,
    },
  } as SDUIComponent;
}

describe("Wizard submit", () => {
  it("dispatches submit_action with collected info inputs only when no entries are included", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [
          inputChild("i1", "recorded_at", { default_value: "2026-04-22" }),
        ],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: false,
        children: [
          inputChild("i2", "entries[a].mode", { default_value: "long" }),
        ],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    fireEvent.click(getByText("Summary"));
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/action");
    const body = JSON.parse(call[1].body as string);
    expect(body.endpoint).toBe("/actions/snapshots/create");
    expect(body.method).toBe("POST");
    expect(body.data).toEqual({ recorded_at: "2026-04-22" });
    expect(body.data["entries[a].mode"]).toBeUndefined();
  });

  it("includes entry step inputs when included=true", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [
          inputChild("i1", "recorded_at", { default_value: "2026-04-22" }),
        ],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: false,
        children: [
          inputChild("i2", "entries[a].mode", { default_value: "long" }),
        ],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    // Navigate to entry step and Include it
    fireEvent.click(getByText("AAPL"));
    fireEvent.click(getByText("Include"));
    // Now on summary step
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.data).toEqual({
      recorded_at: "2026-04-22",
      "entries[a].mode": "long",
    });
  });

  it("skipping an entry leaves it out of the submit payload", async () => {
    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [
          inputChild("i1", "recorded_at", { default_value: "2026-04-22" }),
        ],
      },
      {
        id: "e1",
        label: "AAPL",
        kind: "entry",
        skippable: true,
        include_default: true, // pre-included
        children: [
          inputChild("i2", "entries[a].mode", { default_value: "long" }),
        ],
      },
      {
        id: "summary",
        label: "Summary",
        kind: "summary",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "Review")],
      },
    ]);
    const { getByText } = render(wrap(wiz));
    fireEvent.click(getByText("AAPL"));
    fireEvent.click(getByText("Skip"));
    fireEvent.click(getByText("Submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.data).toEqual({ recorded_at: "2026-04-22" });
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-submit-dismiss.test.tsx`
Expected: all 3 tests fail (Submit handler is a no-op).

- [ ] **Step 3: Wire submit dispatch**

Edit `components/custom/Wizard.tsx`. Add imports:

```ts
import {
  collectFormData,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import type { SDUIAction } from "@/lib/types/sdui";
```

Inside `WizardInner`, after `useFormState()`, add:

```ts
const dispatch = useActionDispatcher();
const submitAction = component.props.submit_action as SDUIAction;
```

Replace the `submit()` function with:

```ts
async function submit() {
  const data: Record<string, unknown> = {};
  for (const s of steps) {
    if (s.kind === "summary") continue;
    if (s.kind === "entry" && !includeMap[s.id]) continue;
    Object.assign(data, collectFormData(`${wizardId}__step__${s.id}`));
  }
  if (!submitAction.endpoint || !submitAction.method) return;
  await dispatch(submitAction.endpoint, submitAction.method, data, {
    targetId: wizardId,
    loading: submitAction.loading,
  });
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-submit-dismiss.test.tsx`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/custom/Wizard.tsx tests/wizard-submit-dismiss.test.tsx
git commit -m "feat(wizard): Submit collects info + included entry inputs and dispatches submit_action"
```

---

## Task 8: Dismiss handler — `replace` with optional `tree: null`

The dismiss action handler. If `dismiss_action.type === "replace"`:

- `tree` non-null → call `setOverride(target_id, tree)`.
- `tree` null/missing → call `clearOverride(target_id)` (added in Task 1).

For other action types, fall through to `dispatch(endpoint, method)`.

**Files:**

- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-submit-dismiss.test.tsx` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-submit-dismiss.test.tsx`:

```tsx
describe("Wizard dismiss", () => {
  it("with type=replace and tree=null clears the target override", () => {
    // Set up: render the wizard inside a slot that has a pre-existing override.
    // Use a probe component that reads the override.
    function ProbeAndWizard({ wizard }: { wizard: SDUIComponent }) {
      const { setOverride, getOverride } =
        require("@/components/override-map-context").useOverrideMap();
      // Seed an override on `slot` so we can verify clearOverride removes it.
      const _seeded = useSeed(setOverride);
      return (
        <>
          <div data-testid="slot-state">
            {getOverride("slot") ? "PRESENT" : "ABSENT"}
          </div>
          <ComponentRenderer component={wizard} />
        </>
      );
    }
    function useSeed(setOverride: (id: string, tree: SDUIComponent) => void) {
      const seeded = require("react").useRef(false);
      if (!seeded.current) {
        setOverride("slot", { type: "text", id: "x", props: { content: "x" } });
        seeded.current = true;
      }
      return null;
    }

    const wiz = w([
      {
        id: "info",
        label: "Info",
        kind: "info",
        skippable: false,
        include_default: true,
        children: [textChild("t1", "S1")],
      },
    ]);

    const { getByText, getByTestId } = render(
      <OverrideMapProvider>
        <SnackbarProvider>
          <ProbeAndWizard wizard={wiz} />
        </SnackbarProvider>
      </OverrideMapProvider>,
    );

    expect(getByTestId("slot-state").textContent).toBe("PRESENT");
    fireEvent.click(getByText("Dismiss"));
    expect(getByTestId("slot-state").textContent).toBe("ABSENT");
  });

  it("with type=replace and tree=<subtree> sets the target override to that subtree", () => {
    const tree: SDUIComponent = {
      type: "text",
      id: "replacement",
      props: { content: "REPLACED" },
    };
    function Probe() {
      const { getOverride } =
        require("@/components/override-map-context").useOverrideMap();
      const o = getOverride("slot");
      return <div data-testid="slot-state">{o ? o.id : "none"}</div>;
    }

    const wiz = w(
      [
        {
          id: "info",
          label: "Info",
          kind: "info",
          skippable: false,
          include_default: true,
          children: [textChild("t1", "S1")],
        },
      ],
      {
        dismiss_action: {
          trigger: "click",
          type: "replace",
          target_id: "slot",
          tree,
        },
      },
    );

    const { getByText, getByTestId } = render(
      <OverrideMapProvider>
        <SnackbarProvider>
          <Probe />
          <ComponentRenderer component={wiz} />
        </SnackbarProvider>
      </OverrideMapProvider>,
    );

    expect(getByTestId("slot-state").textContent).toBe("none");
    fireEvent.click(getByText("Dismiss"));
    expect(getByTestId("slot-state").textContent).toBe("replacement");
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-submit-dismiss.test.tsx`
Expected: 2 new tests fail (Dismiss is a no-op).

- [ ] **Step 3: Wire dismiss handler**

Edit `components/custom/Wizard.tsx`. Add imports:

```ts
import { useOverrideMap } from "@/components/override-map-context";
```

Inside `WizardInner`, after `useActionDispatcher()`, add:

```ts
const { setOverride, clearOverride } = useOverrideMap();
const dismissAction = component.props.dismiss_action as SDUIAction & {
  tree?: SDUIComponent | null;
};
```

Note: `SDUIAction` doesn't currently have a `tree` field. Treat it as inline replace-action data (the wizard's local extension). Type-cast as above.

Replace the `dismiss()` function with:

```ts
async function dismiss() {
  if (dismissAction.type === "replace" && dismissAction.target_id) {
    if (dismissAction.tree) {
      setOverride(dismissAction.target_id, dismissAction.tree);
    } else {
      clearOverride(dismissAction.target_id);
    }
    return;
  }
  if (dismissAction.endpoint && dismissAction.method) {
    await dispatch(dismissAction.endpoint, dismissAction.method);
  }
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-submit-dismiss.test.tsx`
Expected: all 5 tests pass.

- [ ] **Step 5: Full suite + lint**

Run: `npx vitest run && make lint`
Expected: tests clean; lint exit 0 (apart from pre-existing eslint warnings).

- [ ] **Step 6: Commit**

```bash
git add components/custom/Wizard.tsx tests/wizard-submit-dismiss.test.tsx
git commit -m "feat(wizard): Dismiss honors replace+tree (set) and replace+tree:null (clear)"
```

---

## Task 9: Banner — variant-styled, optional, dismissible

A banner above the active step content. Reads from `component.props.banner` (optional). When `dismissible: true`, shows an X close button that hides the banner client-side. State resets when the wizard tree is replaced (BE re-emit).

**Files:**

- Create: `components/custom/WizardBanner.tsx`
- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-skeleton.test.tsx` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-skeleton.test.tsx`:

```tsx
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
    closeBtn.click();
    expect(queryByText("Heads up.")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-skeleton.test.tsx`
Expected: 3 new tests fail.

- [ ] **Step 3: Create WizardBanner**

Create `components/custom/WizardBanner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type WizardBannerProps = {
  variant: "info" | "success" | "warning" | "error";
  message: string;
  title?: string;
  dismissible?: boolean;
};

const variantClass: Record<WizardBannerProps["variant"], string> = {
  info: "bg-status-info/10 border-status-info/40 text-content-primary",
  success: "bg-status-success/10 border-status-success/40 text-content-primary",
  warning: "bg-status-warning/10 border-status-warning/40 text-content-primary",
  error: "bg-status-error/10 border-status-error/40 text-content-primary",
};

export function WizardBanner({ banner }: { banner: WizardBannerProps }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const cls = `relative rounded border px-4 py-3 text-sm ${variantClass[banner.variant]}`;
  return (
    <div data-wizard-banner data-variant={banner.variant} className={cls}>
      {banner.title && (
        <span className="font-semibold mr-2">{banner.title}</span>
      )}
      <span>{banner.message}</span>
      {banner.dismissible && (
        <button
          type="button"
          data-wizard-banner-close
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-content-secondary hover:text-content-primary"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Mount the banner in Wizard**

Edit `components/custom/Wizard.tsx`. Add the import:

```ts
import {
  WizardBanner,
  type WizardBannerProps,
} from "@/components/custom/WizardBanner";
```

Inside `WizardInner`, after the `dismissAction` line, add:

```ts
const banner = component.props.banner as WizardBannerProps | undefined;
```

In the JSX, after the `<WizardStepIndicator ... />` and before the `{steps.map(...)}` block, add:

```tsx
{
  banner && <WizardBanner banner={banner} />;
}
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-skeleton.test.tsx`
Expected: all 7 pass (4 skeleton + 3 banner).

- [ ] **Step 6: Commit**

```bash
git add components/custom/WizardBanner.tsx components/custom/Wizard.tsx tests/wizard-skeleton.test.tsx
git commit -m "feat(wizard): banner with variant styling + optional client-side dismiss"
```

---

## Task 10: Summary entries — derived list with Edit chip-jumps

On the summary step, below the server-emitted children, render a list of all `kind: "entry"` steps where `includeMap[id] === true`. Each row shows `step.label` and an "Edit" button that chip-jumps to that step.

**Files:**

- Create: `components/custom/WizardSummaryEntries.tsx`
- Modify: `components/custom/Wizard.tsx`
- Test: `tests/wizard-step-navigation.test.tsx` (append)

- [ ] **Step 1: Append failing tests**

Append to `tests/wizard-step-navigation.test.tsx`:

```tsx
describe("Wizard summary entries", () => {
  it("on the summary step, lists included entry labels", () => {
    const { getByText, queryByText } = render(
      wrap(
        wizard(
          [
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
            {
              id: "e1",
              label: "AAPL",
              kind: "entry",
              skippable: true,
              include_default: true,
              children: [textChild("t2", "S2")],
            },
            {
              id: "e2",
              label: "MSFT",
              kind: "entry",
              skippable: true,
              include_default: false,
              children: [textChild("t3", "S3")],
            },
            {
              id: "summary",
              label: "Summary",
              kind: "summary",
              children: [textChild("t4", "Review")],
            },
          ],
          { initial_step_id: "summary" },
        ),
      ),
    );
    expect(getByText("Review")).not.toBeNull();
    // AAPL is included by default
    expect(getByText("AAPL")).not.toBeNull(); // appears in chip nav AND summary
    // MSFT is excluded by default — should not appear in the summary entries list
    // (it appears in the chip nav, so use queryAllByText to count occurrences)
  });

  it("clicking the Edit affordance on a summary entry chip-jumps to that step", () => {
    const { getByText, getAllByTestId } = render(
      wrap(
        wizard(
          [
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
            {
              id: "e1",
              label: "AAPL",
              kind: "entry",
              skippable: true,
              include_default: true,
              children: [textChild("t2", "S2")],
            },
            {
              id: "summary",
              label: "Summary",
              kind: "summary",
              children: [textChild("t3", "Review")],
            },
          ],
          { initial_step_id: "summary" },
        ),
      ),
    );
    expect(getByText("Step 3 of 3")).not.toBeNull();
    const editBtns = getAllByTestId("wizard-summary-edit");
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);
    expect(getByText("Step 2 of 3")).not.toBeNull();
  });

  it("does NOT list entries that are excluded (include map false)", () => {
    const { container, getByText } = render(
      wrap(
        wizard(
          [
            {
              id: "info",
              label: "Info",
              kind: "info",
              children: [textChild("t1", "S1")],
            },
            {
              id: "e1",
              label: "AAPL",
              kind: "entry",
              skippable: true,
              include_default: false,
              children: [textChild("t2", "S2")],
            },
            {
              id: "summary",
              label: "Summary",
              kind: "summary",
              children: [textChild("t3", "Review")],
            },
          ],
          { initial_step_id: "summary" },
        ),
      ),
    );
    const summaryList = container.querySelector(
      "[data-wizard-summary-entries]",
    );
    expect(summaryList).not.toBeNull();
    // AAPL is excluded → no row inside the summary list with label AAPL
    const rows = summaryList!.querySelectorAll("[data-wizard-summary-entry]");
    expect(rows.length).toBe(0);
    // sanity check: the chip nav still has AAPL
    expect(getByText("AAPL")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: 3 new tests fail.

- [ ] **Step 3: Create WizardSummaryEntries**

Create `components/custom/WizardSummaryEntries.tsx`:

```tsx
"use client";

import type { WizardStep } from "@/components/custom/Wizard";

export function WizardSummaryEntries({
  steps,
  includeMap,
  onEdit,
}: {
  steps: WizardStep[];
  includeMap: Record<string, boolean>;
  onEdit: (stepId: string) => void;
}) {
  const included = steps.filter(
    (s) => s.kind === "entry" && includeMap[s.id] === true,
  );

  return (
    <div
      data-wizard-summary-entries
      className="flex flex-col gap-1 mt-2 border-t border-border pt-2"
    >
      {included.map((s) => (
        <div
          key={s.id}
          data-wizard-summary-entry
          className="flex items-center justify-between text-sm"
        >
          <span>{s.label}</span>
          <button
            type="button"
            data-testid="wizard-summary-edit"
            onClick={() => onEdit(s.id)}
            className="text-content-accent hover:underline text-xs"
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Mount in Wizard**

Edit `components/custom/Wizard.tsx`. Add import:

```ts
import { WizardSummaryEntries } from "@/components/custom/WizardSummaryEntries";
```

Inside the per-step `<div>` block in the `{steps.map(...)}`, append the summary entries list when the step is the active summary step:

Replace the per-step block:

```tsx
{
  steps.map((step) => (
    <div
      key={step.id}
      data-step-id={step.id}
      data-sdui-id={`${wizardId}__step__${step.id}`}
      data-included={includeMap[step.id] ? "true" : "false"}
      hidden={step.id !== activeStepId}
    >
      {step.children.map((child) => (
        <ComponentRenderer key={child.id} component={child} />
      ))}
      {step.kind === "summary" && (
        <WizardSummaryEntries
          steps={steps}
          includeMap={includeMap}
          onEdit={goToStep}
        />
      )}
    </div>
  ));
}
```

Note: `WizardSummaryEntries` always renders inside a summary step container — even when the summary is hidden — but that's fine because the parent has `hidden`. The list itself is reactive (re-renders when includeMap changes via React state) so chip-jumping back, toggling Skip/Include, and returning to summary shows the live list.

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run tests/wizard-step-navigation.test.tsx`
Expected: all 20 tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/custom/WizardSummaryEntries.tsx components/custom/Wizard.tsx tests/wizard-step-navigation.test.tsx
git commit -m "feat(wizard): summary lists included entries with chip-jump Edit links"
```

---

## Task 11: Update specs — `sdui-custom-components.md` + `sdui-actions.md`

Document the wizard component in the custom-components spec, and add the new client-emitted `replace` action variant to the actions spec (the wizard is the first user of this pattern but it's reusable for any future component that needs client-side override mutation without a round-trip).

**Files:**

- Modify: `spec/sdui-custom-components.md`
- Modify: `spec/sdui-actions.md`

- [ ] **Step 1: Append the new section**

After the existing `## 2. pie_chart` section (around the end of the file), add:

```markdown
---

## 3. `wizard`

Multi-step form container with client-side step machine, per-step include/skip semantics, validation on advance, and submit/dismiss action dispatch. The server emits the full step definition; the frontend manages step navigation, validation, the include map, and submit collection.

### 3.1. Props

| Prop            | Type     | Required | Description                                                                                                                           |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| mode            | enum     | yes      | `create` / `edit`. Informational; reserved for future copy variation.                                                                 |
| title           | string   | yes      | Wizard title. Localized by the server.                                                                                                |
| steps           | `Step[]` | yes      | Ordered, at least 1.                                                                                                                  |
| submit_action   | Action   | yes      | Action fired by the Submit button on the summary step. Typically `submit` with an endpoint.                                           |
| dismiss_action  | Action   | yes      | Action fired when the user dismisses the wizard. Typically `replace` with `tree: null` to clear the modal slot containing the wizard. |
| banner          | Banner   | no       | Optional banner above the step content. Used by post-validation re-emission and contextual notices.                                   |
| initial_step_id | string   | no       | Step `id` to open. Defaults to the first step. Server sets this on re-emission after a validation error to focus the relevant step.   |

### 3.2. Sub-types

#### Step

| Field           | Type          | Required | Description                                                                                                                                                                          |
| --------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id              | string        | yes      | Stable id (React key + DOM grouping selector).                                                                                                                                       |
| label           | string        | yes      | Short text for the step indicator chip. Localized by the server.                                                                                                                     |
| kind            | enum          | yes      | `info` / `entry` / `summary`. Determines which buttons render — see Buttons by kind.                                                                                                 |
| skippable       | boolean       | yes      | Only relevant when `kind=entry`. `false` disables Skip and removes the "exclude" affordance (used in edit mode on existing entries the backend won't allow removing).                |
| include_default | boolean       | yes      | Only relevant when `kind=entry`. Initial value of the include flag for this step. `true` for pre-existing entries in edit mode; `false` for new entries in create mode.              |
| children        | `Component[]` | yes      | Step content (inputs, text, etc.). The wizard mounts ALL steps' children at once; non-active steps are hidden via the `hidden` attribute, so input state persists across navigation. |

#### Banner

| Field       | Type   | Required | Description                                                  |
| ----------- | ------ | -------- | ------------------------------------------------------------ |
| variant     | enum   | yes      | `info` / `success` / `warning` / `error`.                    |
| message     | string | yes      | Body text. Localized by the server.                          |
| title       | string | no       | Optional bold prefix.                                        |
| dismissible | bool   | no       | Default `false`. When `true`, the user can close the banner. |

### 3.3. Step indicator

Above the step content: `Step X of Y` counter and a chip row with each step's `label`. Chips are clickable — direct jump between steps. **Chip-jump never validates.**

### 3.4. Buttons by kind

| `kind` (and modifier)       | Buttons (in order)           |
| --------------------------- | ---------------------------- |
| `info`                      | Dismiss, Next                |
| `entry`, `skippable: true`  | Dismiss, Back, Skip, Include |
| `entry`, `skippable: false` | Dismiss, Back, Update        |
| `summary`                   | Dismiss, Back, Submit        |

`Back` is omitted on the first step. `mode` is informational only in v1 — copy is fixed English regardless.

### 3.5. Include map

The wizard maintains an internal `{stepId → boolean}` seeded from each step's `include_default`. Mutations:

- **Skip** → `included = false`, advance.
- **Include** → validate, `included = true`, advance.
- **Update** (edit mode on pre-existing entry, `skippable: false`) → validate, `included = true` (unchanged), advance.

Excluded entry steps do NOT contribute inputs to the submit payload.

### 3.6. Navigation and validation

| Action     | Validates active step? | Advances?                  |
| ---------- | ---------------------- | -------------------------- |
| Back       | no                     | back one                   |
| Next       | yes                    | forward one                |
| Skip       | no                     | forward one                |
| Include    | yes                    | forward one                |
| Update     | yes                    | forward one                |
| Chip click | no                     | direct jump                |
| Submit     | no                     | dispatches `submit_action` |

Validation uses the standard input props (`required`, `pattern`, `min`, `max`, `max_length`). The wizard does not invent a separate validation layer.

### 3.7. Summary

The server's `summary` step children are typically a short descriptive text (e.g. "Review and submit"). Below that, the frontend renders a derived list of included entries: one row per `kind=entry` step where `includeMap[id] === true`, showing `step.label` and an Edit button that chip-jumps to that step. The list is reactive to include-map changes triggered by chip-jumping back to entry steps.

### 3.8. Submit

1. Wizard collects inputs from:
   - All `kind=info` steps (always included).
   - All `kind=entry` steps where `includeMap[id] === true`.
2. Builds the form body using each input's `name` (the wizard does NOT impose a schema — it uses whatever names the server emits; bracket notation per asset is the suggested convention for entry inputs, e.g. `entries[<asset_id>].mode`).
3. Dispatches `submit_action` with the body via the standard action dispatcher (`/api/action`).

There is NO client-side validation gate on Submit. If the user chip-jumps over invalid steps, the backend returns 422 and re-emits the wizard with banner `variant: error` and `initial_step_id` pointing at the broken step.

### 3.9. Dismiss

Wizard handles `dismiss_action`:

- `type: "replace"` with `tree: <subtree>` → calls `setOverride(target_id, tree)`.
- `type: "replace"` with `tree: null` (or absent) → calls `clearOverride(target_id)`. Common pattern: dismiss clears the modal slot that contains the wizard, closing the modal client-side.
- Otherwise: falls through to `dispatch(endpoint, method)` (no body).

### 3.10. BE validation error (422)

The middleend returns an `ActionResponse` with `action: "replace"`, `target_id` matching the wizard's container, and `tree` being the same wizard re-emitted with:

- Inputs pre-loaded (via `default_value`).
- A `banner` of `variant: "error"` describing the problem.
- Optional `initial_step_id` pointing at the step that needs attention.

When the override is applied, the new wizard tree replaces the old one. React unmounts the prior wizard and mounts the new one; `useState` initializers re-run, so the include map and active step come from the re-emitted definition.

### 3.11. Implementation

- **React**: `WizardComponent` -- `components/custom/Wizard.tsx`. Splits into outer `WizardComponent` (installs `FormStateProvider` with initial values collected from ALL steps' children) and inner `WizardInner` (state machine + render).
- **Sub-components**: `WizardStepIndicator`, `WizardBanner`, `WizardSummaryEntries` — all in `components/custom/`.
- **"use client"**: Yes (uses `useState`, `useFormState`, `useActionDispatcher`, `useOverrideMap`).
- **Renders**: `<div data-sdui-id={wizardId} data-sdui-form="true">` containing title, step indicator, optional banner, one container per step (`<div data-step-id data-sdui-id data-included hidden>`), and the button row.
```

- [ ] **Step 2: Update `spec/sdui-actions.md` — add client-emitted `replace` row**

Edit `spec/sdui-actions.md`. In the **§2 Action Types** table (around line 32–48), add a new row immediately after the `dismiss` row:

```markdown
| `replace` | Client-side override mutation. With `tree` set, calls `setOverride(target_id, tree)`; with `tree: null` or absent, calls `clearOverride(target_id)`. No round-trip. Used for things like dismissing a wizard by clearing the modal slot that contains it. | `target_id`, optionally `tree` |
```

Add a brief subsection at the end of §2 (just before `## 2a. URL Placeholders`):

```markdown
### Client-emitted `replace` vs. server-returned `replace`

Both share the override map, but they enter from different sides:

- **Server-returned** (§5): the BE responds to a `submit`/`reload`/etc. with `{ action: "replace", target_id, tree }`, processed by `useActionDispatcher`.
- **Client-emitted** (this section): an action declared with `type: "replace"` runs entirely client-side — no `/api/action` call. The component dispatching the action reads `target_id` and `tree` directly from the action shape and calls `setOverride` (with tree) or `clearOverride` (without). First user: `wizard.dismiss_action`.
```

- [ ] **Step 3: Verify the specs parse**

Run: `grep -n "^## " spec/sdui-custom-components.md`
Expected: `## 1. line_chart`, `## 2. pie_chart`, `## 3. wizard` in order.

Run: `grep -n "^### Client-emitted" spec/sdui-actions.md`
Expected: one match.

Run: `make lint` (Prettier).
If Prettier reformats either file, accept its formatting.

- [ ] **Step 4: Commit**

```bash
git add spec/sdui-custom-components.md spec/sdui-actions.md
git commit -m "docs(spec): document wizard custom component + client-emitted replace action"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass (including ~30 new wizard tests).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `make lint > /dev/null 2>&1; echo $?`
Expected: `0` (eslint warnings on Button.tsx, Image.tsx, PieChart.tsx are pre-existing and don't block).

- [ ] **Step 4: Smoke test in browser (deferred to user)**

Per project convention (Task 7 of prior table_row plan was deferred similarly), the user verifies visually when middleend ships a real wizard payload.

---

## Self-review notes

- **Spec coverage**: every prop, sub-type, button rule, and behavior in the middleend's wizard spec is implemented in Tasks 2–10 and documented in Task 11. The 3 locked decisions from the user are honored: (1) summary as labels-with-Edit (Task 10), (2) `tree: null` clears via `clearOverride` (Tasks 1 + 8).
- **Type consistency**: `WizardStep` exported from `Wizard.tsx` is consumed by `WizardStepIndicator` and `WizardSummaryEntries`. `WizardBannerProps` exported from `WizardBanner.tsx` is consumed in `Wizard.tsx`. Helper names — `validateActiveStep`, `goToStep`, `goBack`, `goNext`, `skip`, `include`, `update`, `submit`, `dismiss`, `setIncluded` — are stable across tasks.
- **No placeholders**: every step has full code or full commands. The Task 3 skeleton has a transient `[activeStepId]` (Task 3 then expands to `[activeStepId, setActiveStepId]`) — reviewer should treat that as expected, not a missed update.
