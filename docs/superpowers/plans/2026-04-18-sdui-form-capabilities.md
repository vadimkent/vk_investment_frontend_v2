# SDUI Form Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend support for three SDUI contract additions — `input.pattern`, `input.auto_uppercase`, and `visible_when` (reactive visibility in form components) — to unblock the middleend's asset create / edit / delete modals.

**Architecture:** Introduce a `FormStateContext` provided by `Form` and consumed by the 5 form components (`input`, `select`, `checkbox`, `textarea`, `radio_group`) for reactive visibility. `Input` grows local state for regex validation and an `onInput` transform for auto-uppercase. Submit blocking is a DOM scan for `[data-sdui-invalid="true"]` inside the form container, invoked by `Button` (and by the other change-dispatch components when they have `target_id`).

**Tech Stack:** React 19 context + `useSyncExternalStore`, Vitest + `@testing-library/react`, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-18-sdui-form-capabilities-design.md`

---

### Task 1: `collectInitialValues` helper

Pure helper that walks an SDUI tree and extracts default values for every named form field. Used by `Form` to seed `FormStateContext`.

**Files:**

- Create: `lib/collect-initial-values.ts`
- Test: `tests/collect-initial-values.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/collect-initial-values.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { collectInitialValues } from "@/lib/collect-initial-values";
import type { SDUIComponent } from "@/lib/types/sdui";

function c(
  type: string,
  id: string,
  props: Record<string, unknown> = {},
  children?: SDUIComponent[],
): SDUIComponent {
  return { type, id, props, children };
}

describe("collectInitialValues", () => {
  it("returns empty object for a leaf node with no form children", () => {
    expect(collectInitialValues(c("text", "t1", { content: "hi" }))).toEqual(
      {},
    );
  });

  it("reads input default_value", () => {
    const tree = c("form", "f", {}, [
      c("input", "i", { name: "ticker", default_value: "AAPL" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({ ticker: "AAPL" });
  });

  it("defaults input value to empty string when no default_value", () => {
    const tree = c("form", "f", {}, [c("input", "i", { name: "note" })]);
    expect(collectInitialValues(tree)).toEqual({ note: "" });
  });

  it("reads checkbox default (checked)", () => {
    const tree = c("form", "f", {}, [
      c("checkbox", "c1", { name: "is_complex", checked: true }),
      c("checkbox", "c2", { name: "archived" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({
      is_complex: true,
      archived: false,
    });
  });

  it("reads select and radio_group default_value", () => {
    const tree = c("form", "f", {}, [
      c("select", "s", { name: "provider", default_value: "yahoo" }),
      c("radio_group", "r", { name: "kind", default_value: "stock" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({
      provider: "yahoo",
      kind: "stock",
    });
  });

  it("reads textarea default_value", () => {
    const tree = c("form", "f", {}, [
      c("textarea", "t", { name: "notes", default_value: "hello" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({ notes: "hello" });
  });

  it("recurses into nested containers", () => {
    const tree = c("form", "f", {}, [
      c("column", "col", {}, [
        c("card", "card", {}, [
          c("input", "i", { name: "ticker", default_value: "AAPL" }),
        ]),
      ]),
    ]);
    expect(collectInitialValues(tree)).toEqual({ ticker: "AAPL" });
  });

  it("skips components without a name prop", () => {
    const tree = c("form", "f", {}, [
      c("input", "i", { default_value: "no-name" }),
    ]);
    expect(collectInitialValues(tree)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/collect-initial-values.test.ts`
Expected: FAIL — module `@/lib/collect-initial-values` not found.

- [ ] **Step 3: Write the implementation**

Create `lib/collect-initial-values.ts`:

```ts
import type { SDUIComponent } from "@/lib/types/sdui";

const FORM_FIELD_TYPES = new Set([
  "input",
  "select",
  "checkbox",
  "textarea",
  "radio_group",
]);

export function collectInitialValues(
  component: SDUIComponent,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  walk(component, out);
  return out;
}

function walk(node: SDUIComponent, out: Record<string, unknown>): void {
  if (FORM_FIELD_TYPES.has(node.type)) {
    const name = node.props.name as string | undefined;
    if (name) {
      out[name] = readDefault(node);
    }
  }
  if (node.children) {
    for (const child of node.children) walk(child, out);
  }
}

function readDefault(node: SDUIComponent): unknown {
  switch (node.type) {
    case "checkbox":
      return node.props.checked === true;
    case "input":
    case "textarea":
      return (node.props.default_value as string | undefined) ?? "";
    case "select":
    case "radio_group":
      return (node.props.default_value as string | undefined) ?? "";
    default:
      return undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/collect-initial-values.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/collect-initial-values.ts tests/collect-initial-values.test.ts
git commit -m "feat: add collectInitialValues helper for SDUI form defaults"
```

---

### Task 2: `FormStateContext` provider, hooks, and `evalVisibleWhen`

Reactive per-field store for forms. `Form` provides it, form components publish and subscribe.

**Files:**

- Create: `components/form-state-context.tsx`
- Test: `tests/form-state-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/form-state-context.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  FormStateProvider,
  useFieldValue,
  useFormState,
  evalVisibleWhen,
} from "@/components/form-state-context";
import type { ReactNode } from "react";

describe("evalVisibleWhen", () => {
  it("eq matches strictly equal values", () => {
    expect(evalVisibleWhen({ field: "x", op: "eq", value: "" }, "")).toBe(true);
    expect(evalVisibleWhen({ field: "x", op: "eq", value: "a" }, "b")).toBe(
      false,
    );
  });
  it("ne matches strictly non-equal values", () => {
    expect(evalVisibleWhen({ field: "x", op: "ne", value: "" }, "a")).toBe(
      true,
    );
    expect(evalVisibleWhen({ field: "x", op: "ne", value: false }, false)).toBe(
      false,
    );
  });
  it("unknown op fails open (returns true)", () => {
    expect(
      evalVisibleWhen({ field: "x", op: "xyz" as "eq", value: "a" }, "a"),
    ).toBe(true);
  });
  it("handles boolean and number equality", () => {
    expect(evalVisibleWhen({ field: "x", op: "eq", value: true }, true)).toBe(
      true,
    );
    expect(evalVisibleWhen({ field: "x", op: "eq", value: 3 }, 3)).toBe(true);
  });
});

describe("FormStateContext", () => {
  it("useFormState returns null outside a provider", () => {
    const { result } = renderHook(() => useFormState());
    expect(result.current).toBe(null);
  });

  it("useFieldValue returns undefined outside a provider", () => {
    const { result } = renderHook(() => useFieldValue("ticker"));
    expect(result.current).toBeUndefined();
  });

  it("seeds values from initial prop", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ ticker: "AAPL", complex: true }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(() => useFieldValue("ticker"), { wrapper });
    expect(result.current).toBe("AAPL");
  });

  it("setValue updates the value and triggers subscribers", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ ticker: "AAPL" }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(
      () => ({ value: useFieldValue("ticker"), ctx: useFormState() }),
      { wrapper },
    );
    expect(result.current.value).toBe("AAPL");
    act(() => {
      result.current.ctx!.setValue("ticker", "MSFT");
    });
    expect(result.current.value).toBe("MSFT");
  });

  it("subscribers of other fields do not re-render when unrelated field changes", () => {
    let renderCount = 0;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStateProvider initial={{ a: "1", b: "2" }}>
        {children}
      </FormStateProvider>
    );
    const { result } = renderHook(
      () => {
        renderCount++;
        return { a: useFieldValue("a"), ctx: useFormState() };
      },
      { wrapper },
    );
    const before = renderCount;
    act(() => {
      result.current.ctx!.setValue("b", "changed");
    });
    expect(renderCount).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/form-state-context.test.tsx`
Expected: FAIL — module `@/components/form-state-context` not found.

- [ ] **Step 3: Write the implementation**

Create `components/form-state-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type VisibleWhen = {
  field: string;
  op: "eq" | "ne";
  value: unknown;
};

export interface FormStateContextValue {
  getValue: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
  subscribe: (name: string, cb: () => void) => () => void;
}

const FormStateContext = createContext<FormStateContextValue | null>(null);

export function useFormState(): FormStateContextValue | null {
  return useContext(FormStateContext);
}

export function useFieldValue(name: string): unknown {
  const ctx = useContext(FormStateContext);
  return useSyncExternalStore(
    (cb) => (ctx ? ctx.subscribe(name, cb) : () => {}),
    () => (ctx ? ctx.getValue(name) : undefined),
    () => (ctx ? ctx.getValue(name) : undefined),
  );
}

export function evalVisibleWhen(vw: VisibleWhen, value: unknown): boolean {
  switch (vw.op) {
    case "eq":
      return value === vw.value;
    case "ne":
      return value !== vw.value;
    default:
      return true;
  }
}

export function FormStateProvider({
  initial,
  children,
}: {
  initial: Record<string, unknown>;
  children: ReactNode;
}) {
  const valuesRef = useRef<Map<string, unknown> | null>(null);
  const listenersRef = useRef<Map<string, Set<() => void>> | null>(null);

  if (!valuesRef.current) {
    valuesRef.current = new Map(Object.entries(initial));
  }
  if (!listenersRef.current) {
    listenersRef.current = new Map();
  }

  const ctx = useMemo<FormStateContextValue>(() => {
    const values = valuesRef.current!;
    const listeners = listenersRef.current!;
    return {
      getValue(name) {
        return values.get(name);
      },
      setValue(name, value) {
        if (values.get(name) === value) return;
        values.set(name, value);
        listeners.get(name)?.forEach((cb) => cb());
      },
      subscribe(name, cb) {
        let set = listeners.get(name);
        if (!set) {
          set = new Set();
          listeners.set(name, set);
        }
        set.add(cb);
        return () => {
          set!.delete(cb);
        };
      },
    };
  }, []);

  return (
    <FormStateContext.Provider value={ctx}>
      {children}
    </FormStateContext.Provider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/form-state-context.test.tsx`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add components/form-state-context.tsx tests/form-state-context.test.tsx
git commit -m "feat: add FormStateContext for reactive form field state"
```

---

### Task 3: Wire `FormComponent` with `FormStateProvider`

`Form` computes initial values from its SDUI subtree and wraps children in `FormStateProvider`.

**Files:**

- Modify: `components/base/Form.tsx`
- Test: `tests/form-wiring.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/form-wiring.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FormComponent } from "@/components/base/Form";
import type { SDUIComponent } from "@/lib/types/sdui";

describe("FormComponent renders its children as an SDUI form", () => {
  it("renders an input child with its default_value", () => {
    const tree: SDUIComponent = {
      type: "form",
      id: "f",
      props: {},
      children: [
        {
          type: "input",
          id: "ticker-input",
          props: { name: "ticker", default_value: "AAPL" },
        },
      ],
    };
    const { container } = render(<FormComponent component={tree} />);
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("AAPL");
  });
});
```

- [ ] **Step 2: Run test to verify the baseline passes**

Run: `npx vitest run tests/form-wiring.test.tsx`
Expected: PASS — Form already renders children. This test guards against regressions when we add the provider wrapper.

- [ ] **Step 3: Modify `Form.tsx`**

Replace `components/base/Form.tsx` with:

```tsx
import type { SDUIComponent } from "@/lib/types/sdui";
import { ComponentRenderer } from "@/components/renderer";
import { containerProps } from "@/lib/sdui-utils";
import { FormStateProvider } from "@/components/form-state-context";
import { collectInitialValues } from "@/lib/collect-initial-values";

export function FormComponent({ component }: { component: SDUIComponent }) {
  const shared = containerProps(component);
  const loading = component.props.loading === true;
  const loadingClass = loading ? " opacity-50 pointer-events-none" : "";
  const classes = [shared.className, loadingClass].filter(Boolean).join(" ");
  const initial = collectInitialValues(component);

  return (
    <FormStateProvider initial={initial}>
      <div
        data-sdui-id={component.id}
        data-sdui-form="true"
        className={classes || undefined}
        style={Object.keys(shared.style).length ? shared.style : undefined}
      >
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </div>
    </FormStateProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx vitest run tests/form-wiring.test.tsx`
Expected: PASS. (The real integration coverage for the provider comes in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add components/base/Form.tsx tests/form-wiring.test.tsx
git commit -m "feat: wire FormComponent with FormStateProvider and initial values"
```

---

### Task 4: `Input` — `pattern`, `auto_uppercase`, publish, `visible_when`

Add regex validation, uppercase transform, form-state publish, and visible_when gating to `Input`.

**Files:**

- Modify: `components/base/Input.tsx`
- Test: `tests/input-pattern.test.tsx`
- Test: `tests/input-auto-uppercase.test.tsx`
- Test: `tests/input-visible-when.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/input-pattern.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

function renderInput(props: Record<string, unknown>) {
  return render(
    <FormStateProvider initial={{}}>
      <InputComponent
        component={{
          type: "input",
          id: "test-input",
          props: { name: "ticker", ...props },
        }}
      />
    </FormStateProvider>,
  );
}

describe("Input pattern validation", () => {
  it("does not mark valid values as invalid on input", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "AAPL" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("marks invalid values on input", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.getAttribute("data-sdui-invalid")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("treats empty value as valid even with pattern", () => {
    const { container } = renderInput({ pattern: "^[A-Z]+$" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });

  it("invalid regex is silently ignored", () => {
    const { container } = renderInput({ pattern: "[unclosed" });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "anything" } });
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });

  it("does not mark invalid on mount even if default_value fails pattern", () => {
    const { container } = renderInput({
      pattern: "^[A-Z]+$",
      default_value: "aapl",
    });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });
});
```

Create `tests/input-auto-uppercase.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

function renderInput(props: Record<string, unknown>) {
  return render(
    <FormStateProvider initial={{}}>
      <InputComponent
        component={{
          type: "input",
          id: "test-input",
          props: { name: "ticker", ...props },
        }}
      />
    </FormStateProvider>,
  );
}

describe("Input auto_uppercase", () => {
  it("transforms typed lowercase to uppercase", () => {
    const { container } = renderInput({ auto_uppercase: true });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("AAPL");
  });

  it("is a no-op when auto_uppercase is absent", () => {
    const { container } = renderInput({});
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("aapl");
  });

  it("combines with pattern: uppercase happens before validation", () => {
    const { container } = renderInput({
      auto_uppercase: true,
      pattern: "^[A-Z]+$",
    });
    const input = container.querySelector(
      'input[name="ticker"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "aapl" } });
    expect(input.value).toBe("AAPL");
    expect(input.getAttribute("data-sdui-invalid")).toBeNull();
  });
});
```

Create `tests/input-visible-when.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("Input visible_when", () => {
  it("renders when evaluation is true", () => {
    const { container } = render(
      <FormStateProvider initial={{ kind: "stock" }}>
        <InputComponent
          component={{
            type: "input",
            id: "t",
            props: {
              name: "ticker",
              visible_when: { field: "kind", op: "eq", value: "stock" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="ticker"]')).not.toBeNull();
  });

  it("unmounts when evaluation is false", () => {
    const { container } = render(
      <FormStateProvider initial={{ kind: "bond" }}>
        <InputComponent
          component={{
            type: "input",
            id: "t",
            props: {
              name: "ticker",
              visible_when: { field: "kind", op: "eq", value: "stock" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="ticker"]')).toBeNull();
  });

  it("is always visible outside a FormStateProvider (fail open)", () => {
    const { container } = render(
      <InputComponent
        component={{
          type: "input",
          id: "t",
          props: {
            name: "ticker",
            visible_when: { field: "kind", op: "eq", value: "stock" },
          },
        }}
      />,
    );
    expect(container.querySelector('input[name="ticker"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/input-pattern.test.tsx tests/input-auto-uppercase.test.tsx tests/input-visible-when.test.tsx`
Expected: multiple FAIL — `data-sdui-invalid` never set, auto_uppercase not applied, visible_when not honored.

- [ ] **Step 3: Rewrite `Input.tsx`**

Replace `components/base/Input.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

export function InputComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const inputType = String(component.props.input_type ?? "text");
  const placeholder = component.props.placeholder
    ? String(component.props.placeholder)
    : undefined;
  const label = component.props.label as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const defaultValue = component.props.default_value as string | undefined;
  const maxLength = component.props.max_length as number | undefined;
  const pattern = component.props.pattern as string | undefined;
  const autoUppercase = component.props.auto_uppercase === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  const [invalid, setInvalid] = useState(false);

  const regex = useMemo(() => {
    if (!pattern) return null;
    try {
      return new RegExp(pattern);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Invalid pattern for input ${component.id}: ${pattern}`);
      }
      return null;
    }
  }, [pattern, component.id]);

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function runChecks(el: HTMLInputElement) {
    if (autoUppercase) {
      const upper = el.value.toUpperCase();
      if (el.value !== upper) el.value = upper;
    }
    if (regex) {
      const v = el.value;
      setInvalid(v !== "" && !regex.test(v));
    }
    formCtx?.setValue(name, el.value);
  }

  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed bg-surface-muted"
    : "";
  const borderClass = invalid
    ? "border-status-error focus-visible:ring-status-error/40"
    : "border-border-input";

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <input
        name={name}
        type={inputType}
        placeholder={placeholder}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        data-sdui-invalid={invalid ? "true" : undefined}
        onInput={(e) => runChecks(e.currentTarget)}
        onBlur={(e) => runChecks(e.currentTarget)}
        className={`border ${borderClass} rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/input-pattern.test.tsx tests/input-auto-uppercase.test.tsx tests/input-visible-when.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/Input.tsx tests/input-pattern.test.tsx tests/input-auto-uppercase.test.tsx tests/input-visible-when.test.tsx
git commit -m "feat: add pattern, auto_uppercase, and visible_when to Input"
```

---

### Task 5: `hasInvalidFields` helper in `action-dispatcher.tsx`

Export a helper for scanning a form container for invalid inputs.

**Files:**

- Modify: `components/action-dispatcher.tsx`
- Test: `tests/has-invalid-fields.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/has-invalid-fields.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { hasInvalidFields } from "@/components/action-dispatcher";

describe("hasInvalidFields", () => {
  beforeEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  function mountContainer(targetId: string, invalid: boolean) {
    const div = document.createElement("div");
    div.setAttribute("data-sdui-id", targetId);
    const input = document.createElement("input");
    input.setAttribute("name", "a");
    if (invalid) input.setAttribute("data-sdui-invalid", "true");
    div.appendChild(input);
    document.body.appendChild(div);
  }

  it("returns false when target container is missing", () => {
    expect(hasInvalidFields("missing")).toBe(false);
  });

  it("returns false when no invalid descendants", () => {
    mountContainer("form-x", false);
    expect(hasInvalidFields("form-x")).toBe(false);
  });

  it("returns true when any descendant has data-sdui-invalid=true", () => {
    mountContainer("form-x", true);
    expect(hasInvalidFields("form-x")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/has-invalid-fields.test.ts`
Expected: FAIL — `hasInvalidFields` not exported.

- [ ] **Step 3: Add the export to `action-dispatcher.tsx`**

In `components/action-dispatcher.tsx`, add this export block right after the existing `collectFormData` function (before `useActionDispatcher`):

```ts
export function hasInvalidFields(targetId: string): boolean {
  const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
  return !!container?.querySelector('[data-sdui-invalid="true"]');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/has-invalid-fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/action-dispatcher.tsx tests/has-invalid-fields.test.ts
git commit -m "feat: add hasInvalidFields helper for submit blocking"
```

---

### Task 6: `Button` — submit blocking

`ButtonComponent` checks `hasInvalidFields` before dispatching a `submit` action.

**Files:**

- Modify: `components/base/Button.tsx` (the `submit` case in `handleClick`)
- Test: `tests/button-submit-blocking.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/button-submit-blocking.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/button-submit-blocking.test.tsx`
Expected: FAIL — first test fails because dispatch is called even with invalid fields.

- [ ] **Step 3: Modify `Button.tsx`'s `submit` case**

In `components/base/Button.tsx`:

1. Update the import from `@/components/action-dispatcher` to include `hasInvalidFields`. The current line is:

   ```tsx
   import {
     collectFormData,
     useActionDispatcher,
   } from "@/components/action-dispatcher";
   ```

   Change to:

   ```tsx
   import {
     collectFormData,
     hasInvalidFields,
     useActionDispatcher,
   } from "@/components/action-dispatcher";
   ```

2. Replace the existing `case "submit":` block (inside `handleClick`) with:

```tsx
case "submit":
  if (action.endpoint) {
    if (action.target_id && hasInvalidFields(action.target_id)) {
      const container = document.querySelector(
        `[data-sdui-id="${action.target_id}"]`,
      );
      container
        ?.querySelector<HTMLElement>('[data-sdui-invalid="true"]')
        ?.focus();
      break;
    }
    const data = action.target_id
      ? collectFormData(action.target_id)
      : {};
    const endpoint = substitutePlaceholders(action.endpoint, placeholders);
    await dispatch(endpoint, action.method ?? "POST", data, {
      loading: action.loading,
      targetId: action.target_id,
    });
  }
  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/button-submit-blocking.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/Button.tsx tests/button-submit-blocking.test.tsx
git commit -m "feat: block Button submit when form contains invalid fields"
```

---

### Task 7: `Textarea` — publish + `visible_when`

`TextareaComponent` publishes its value on change and honors `visible_when`.

**Files:**

- Modify: `components/base/Textarea.tsx`
- Test: `tests/textarea-form-integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/textarea-form-integration.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TextareaComponent } from "@/components/base/Textarea";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("Textarea + FormStateContext", () => {
  it("unmounts when visible_when evaluates false", () => {
    const { container } = render(
      <FormStateProvider initial={{ mode: "short" }}>
        <TextareaComponent
          component={{
            type: "textarea",
            id: "t",
            props: {
              name: "notes",
              visible_when: { field: "mode", op: "eq", value: "long" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('textarea[name="notes"]')).toBeNull();
  });

  it("publishes typed value so a visible_when that reads it can react", () => {
    const { container } = render(
      <FormStateProvider initial={{ notes: "" }}>
        <TextareaComponent
          component={{
            type: "textarea",
            id: "ta",
            props: { name: "notes" },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "flag",
            props: {
              name: "flag",
              visible_when: { field: "notes", op: "ne", value: "" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="flag"]')).toBeNull();
    const ta = container.querySelector(
      'textarea[name="notes"]',
    ) as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: "anything" } });
    expect(container.querySelector('input[name="flag"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/textarea-form-integration.test.tsx`
Expected: FAIL — visible_when not honored, value not published.

- [ ] **Step 3: Rewrite `Textarea.tsx`**

Replace `components/base/Textarea.tsx` with:

```tsx
"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

export function TextareaComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const placeholder = component.props.placeholder as string | undefined;
  const defaultValue = component.props.default_value as string | undefined;
  const rows = (component.props.rows as number) ?? 3;
  const maxLength = component.props.max_length as number | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");
  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  const disabledClass = disabled
    ? " opacity-50 cursor-not-allowed bg-surface-muted"
    : "";

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        onInput={(e) => formCtx?.setValue(name, e.currentTarget.value)}
        className={`border border-border-input rounded px-3 py-2 w-full${disabledClass}`}
        data-sdui-id={component.id}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/textarea-form-integration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/Textarea.tsx tests/textarea-form-integration.test.tsx
git commit -m "feat: add publish + visible_when to Textarea"
```

---

### Task 8: `Checkbox` — publish + `visible_when` + submit block

`CheckboxComponent` publishes its value, honors `visible_when`, and respects submit blocking when `target_id` is present.

**Files:**

- Modify: `components/base/Checkbox.tsx`
- Test: `tests/checkbox-form-integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/checkbox-form-integration.test.tsx`:

```tsx
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

describe("Checkbox + FormStateContext", () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    cleanup();
  });

  it("publishes checked value and gates another field visibility", async () => {
    const { CheckboxComponent } = await import("@/components/base/Checkbox");
    const { InputComponent } = await import("@/components/base/Input");
    const { FormStateProvider } =
      await import("@/components/form-state-context");

    const { container } = render(
      <FormStateProvider initial={{ is_complex: false }}>
        <CheckboxComponent
          component={{
            type: "checkbox",
            id: "c",
            props: { name: "is_complex", label: "Complex" },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "i",
            props: {
              name: "external_ticker",
              visible_when: { field: "is_complex", op: "eq", value: false },
            },
          }}
        />
      </FormStateProvider>,
    );

    expect(
      container.querySelector('input[name="external_ticker"]'),
    ).not.toBeNull();
    const cb = container.querySelector(
      'input[name="is_complex"]',
    ) as HTMLInputElement;
    fireEvent.click(cb);
    expect(container.querySelector('input[name="external_ticker"]')).toBeNull();
  });

  it("does not dispatch change action when target_id form has invalid fields", async () => {
    const { CheckboxComponent } = await import("@/components/base/Checkbox");

    function buildFormWithInvalidField(): HTMLElement {
      const wrap = document.createElement("div");
      wrap.setAttribute("data-sdui-id", "form-x");
      const bad = document.createElement("input");
      bad.setAttribute("name", "ticker");
      bad.setAttribute("data-sdui-invalid", "true");
      wrap.appendChild(bad);
      return wrap;
    }

    const { container } = render(
      <>
        <div id="wrap" />
        <CheckboxComponent
          component={{
            type: "checkbox",
            id: "c",
            props: { name: "is_complex", label: "Complex" },
            actions: [
              {
                trigger: "change",
                type: "submit",
                endpoint: "/actions/assets/partial_update",
                target_id: "form-x",
              },
            ],
          }}
        />
      </>,
    );
    container.querySelector("#wrap")!.appendChild(buildFormWithInvalidField());

    const cb = container.querySelector(
      'input[name="is_complex"]',
    ) as HTMLInputElement;
    fireEvent.click(cb);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/checkbox-form-integration.test.tsx`
Expected: FAIL — visible_when not honored, dispatch not blocked.

- [ ] **Step 3: Rewrite `Checkbox.tsx`**

Replace `components/base/Checkbox.tsx` with:

```tsx
"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

export function CheckboxComponent({ component }: { component: SDUIComponent }) {
  const name = String(component.props.name);
  const label = String(component.props.label);
  const checked = component.props.checked === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function handleChange(value: boolean) {
    formCtx?.setValue(name, value);
    if (!changeAction?.endpoint) return;
    if (changeAction.target_id && hasInvalidFields(changeAction.target_id))
      return;
    const data = changeAction.target_id
      ? collectFormData(changeAction.target_id)
      : { [name]: value };
    dispatch(changeAction.endpoint, changeAction.method ?? "POST", data, {
      loading: changeAction.loading,
      targetId: changeAction.target_id,
    });
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="w-4 h-4 rounded border-border-input"
        data-sdui-id={component.id}
        onChange={(e) => handleChange(e.target.checked)}
      />
      <span className={disabled ? "text-content-muted" : ""}>{label}</span>
    </label>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/checkbox-form-integration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/Checkbox.tsx tests/checkbox-form-integration.test.tsx
git commit -m "feat: add publish, visible_when, and submit block to Checkbox"
```

---

### Task 9: `RadioGroup` — publish + `visible_when` + submit block

Same pattern as Checkbox.

**Files:**

- Modify: `components/base/RadioGroup.tsx`
- Test: `tests/radio-group-form-integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/radio-group-form-integration.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { RadioGroupComponent } from "@/components/base/RadioGroup";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("RadioGroup + FormStateContext", () => {
  it("publishes selected value and gates another field visibility", () => {
    const { container } = render(
      <FormStateProvider initial={{ kind: "stock" }}>
        <RadioGroupComponent
          component={{
            type: "radio_group",
            id: "r",
            props: {
              name: "kind",
              options: [
                { value: "stock", label: "Stock" },
                { value: "bond", label: "Bond" },
              ],
              default_value: "stock",
            },
          }}
        />
        <InputComponent
          component={{
            type: "input",
            id: "t",
            props: {
              name: "ticker",
              visible_when: { field: "kind", op: "eq", value: "stock" },
            },
          }}
        />
      </FormStateProvider>,
    );

    expect(container.querySelector('input[name="ticker"]')).not.toBeNull();

    const bondRadio = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="kind"]'),
    ).find((r) => r.value === "bond")!;
    fireEvent.click(bondRadio);

    expect(container.querySelector('input[name="ticker"]')).toBeNull();
  });

  it("unmounts when its own visible_when is false", () => {
    const { container } = render(
      <FormStateProvider initial={{ mode: "off" }}>
        <RadioGroupComponent
          component={{
            type: "radio_group",
            id: "r",
            props: {
              name: "kind",
              options: [{ value: "a", label: "A" }],
              visible_when: { field: "mode", op: "eq", value: "on" },
            },
          }}
        />
      </FormStateProvider>,
    );
    expect(container.querySelector('input[name="kind"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/radio-group-form-integration.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `RadioGroup.tsx`**

Replace `components/base/RadioGroup.tsx` with:

```tsx
"use client";

import type { SDUIComponent } from "@/lib/types/sdui";
import {
  collectFormData,
  hasInvalidFields,
  useActionDispatcher,
} from "@/components/action-dispatcher";
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";

interface Option {
  value: string;
  label: string;
}

export function RadioGroupComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const options = (component.props.options as Option[]) ?? [];
  const defaultValue = component.props.default_value as string | undefined;
  const required = component.props.required === true;
  const disabled = component.props.disabled === true;
  const vw = component.props.visible_when as VisibleWhen | undefined;

  const formCtx = useFormState();
  const depValue = useFieldValue(vw?.field ?? "");

  const dispatch = useActionDispatcher();
  const changeAction = component.actions?.find((a) => a.trigger === "change");

  if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;

  function handleChange(value: string) {
    formCtx?.setValue(name, value);
    if (!changeAction?.endpoint) return;
    if (changeAction.target_id && hasInvalidFields(changeAction.target_id))
      return;
    const data = changeAction.target_id
      ? collectFormData(changeAction.target_id)
      : { [name]: value };
    dispatch(changeAction.endpoint, changeAction.method ?? "POST", data, {
      loading: changeAction.loading,
      targetId: changeAction.target_id,
    });
  }

  return (
    <fieldset data-sdui-id={component.id}>
      {label && (
        <legend className="text-sm font-medium text-content-secondary mb-2">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </legend>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={opt.value === defaultValue}
              disabled={disabled}
              required={required}
              className="w-4 h-4"
              onChange={(e) => handleChange(e.target.value)}
            />
            <span className={disabled ? "text-content-muted" : ""}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/radio-group-form-integration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/RadioGroup.tsx tests/radio-group-form-integration.test.tsx
git commit -m "feat: add publish, visible_when, and submit block to RadioGroup"
```

---

### Task 10: `Select` — publish + `visible_when` + submit block

`Select` already manages local state and dispatches change actions with URL placeholder substitution. Augment it without disrupting that logic.

**Files:**

- Modify: `components/base/Select.tsx`
- Test: `tests/select-form-integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/select-form-integration.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SelectComponent } from "@/components/base/Select";
import { InputComponent } from "@/components/base/Input";
import { FormStateProvider } from "@/components/form-state-context";

describe("Select + FormStateContext", () => {
  it("keeps its hidden input value in sync with the default_value", () => {
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

  it("unmounts when its own visible_when is false", () => {
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

  it("clear button publishes empty value, which can hide a ne-based field", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/select-form-integration.test.tsx`
Expected: FAIL on the visibility tests.

- [ ] **Step 3: Modify `Select.tsx`**

Edit `components/base/Select.tsx`:

1. Add these imports near the top (alongside the existing `substitutePlaceholders` import):

```tsx
import {
  evalVisibleWhen,
  useFieldValue,
  useFormState,
  type VisibleWhen,
} from "@/components/form-state-context";
import { hasInvalidFields } from "@/components/action-dispatcher";
```

2. In the component body, right after the prop reads (after `disabled = component.props.disabled === true;`), add:

```tsx
const vw = component.props.visible_when as VisibleWhen | undefined;
const formCtx = useFormState();
const depValue = useFieldValue(vw?.field ?? "");
```

3. Immediately **after** the existing `useState`, add:

```tsx
if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;
```

(All hooks are called before this early return — `useState`, `useFormState`, `useFieldValue` are all already above.)

4. Rewrite `handleChange` to:

```tsx
function handleChange(next: string) {
  setValue(next);
  formCtx?.setValue(name, next);
  if (!changeAction?.endpoint) return;
  const placeholders = { value: next };
  const endpoint = substitutePlaceholders(changeAction.endpoint, placeholders);
  if (changeAction.target_id && hasInvalidFields(changeAction.target_id))
    return;

  switch (changeAction.type) {
    case "reload":
      dispatch(endpoint, "GET", undefined, {
        loading: changeAction.loading,
        targetId: changeAction.target_id,
      });
      break;
    case "submit":
      dispatch(
        endpoint,
        changeAction.method ?? "POST",
        changeAction.target_id
          ? { ...collectFormData(changeAction.target_id), [name]: next }
          : { [name]: next },
        {
          loading: changeAction.loading,
          targetId: changeAction.target_id,
        },
      );
      break;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/select-form-integration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/base/Select.tsx tests/select-form-integration.test.tsx
git commit -m "feat: add publish, visible_when, and submit block to Select"
```

---

### Task 11: Spec updates

Document the three new capabilities in `spec/sdui-base-components.md`.

**Files:**

- Modify: `spec/sdui-base-components.md`

- [ ] **Step 1: Add `pattern` and `auto_uppercase` rows to the `input` prop table**

Find the `input` section and add these two rows at the bottom of its prop table, before the React/"use client" lines:

```
| pattern        | string  | no       | Regex (ECMAScript) for on-change and on-blur validation. When the value fails the regex (and is non-empty), the input is marked invalid (`data-sdui-invalid="true"`, red border, `aria-invalid`), and form submits through a `Button`, `Select`, `Checkbox`, or `RadioGroup` with `target_id` pointing to the enclosing form are blocked until the invalid state is cleared. Invalid regex is silently ignored. |
| auto_uppercase | boolean | no       | If true, the frontend transforms the typed value to uppercase on every input event. Combines with `pattern`: the transform runs before validation, so `auto_uppercase: true` + `pattern: "^[A-Z]+$"` accepts lowercase typing. |
```

- [ ] **Step 2: Add a final section on `visible_when`**

Append to the end of `spec/sdui-base-components.md`:

````
---

## Form component visibility: `visible_when`

Any of the five form components (`input`, `select`, `checkbox`, `textarea`, `radio_group`) may include a `visible_when` prop to make its rendering conditional on the current value of another field in the same `form`.

```ts
type VisibleWhen = {
  field: string;        // name of another form control in the same form
  op: "eq" | "ne";
  value: string | boolean | number;
};
```

Semantics:

- The frontend evaluates the condition on the current value of the referenced field (reactive — re-evaluates on every change of that field).
- `true` → component renders normally.
- `false` → component **unmounts** (returns `null`). It is not in the DOM, and `collectFormData` does not see it → hidden fields do not contribute to form submission data.
- Re-showing the field mounts a fresh instance starting from its `default_value` — any previously-typed value is lost by design.
- No compound `and`/`or` expressions. If more complex logic is needed, the middleend handles it via a round-trip.
- Outside a `form`, `visible_when` is a no-op (component always visible).

**Implementation:** `components/form-state-context.tsx` owns the reactive store. `FormComponent` seeds it with `collectInitialValues` (walks its SDUI subtree for default values). Each form component publishes its value on change via `useFormState().setValue(name, value)` and, if it has `visible_when`, subscribes to the referenced field via `useFieldValue(field)`. The pure helper `evalVisibleWhen(vw, value)` returns the visibility boolean.

**Example (asset create modal):**

```json
{
  "type": "checkbox",
  "id": "create-is-complex",
  "props": { "name": "is_complex", "label": "Complex asset" }
}

{
  "type": "select",
  "id": "create-price-provider",
  "props": {
    "name": "price_provider",
    "options": [],
    "visible_when": { "field": "is_complex", "op": "eq", "value": false }
  }
}

{
  "type": "input",
  "id": "create-external-ticker",
  "props": {
    "name": "external_ticker",
    "input_type": "text",
    "visible_when": { "field": "price_provider", "op": "ne", "value": "" }
  }
}
```

`price_provider` shows only when `is_complex` is unchecked. `external_ticker` shows only when `price_provider` has a non-empty value.
````

- [ ] **Step 3: Commit**

```bash
git add spec/sdui-base-components.md
git commit -m "docs: add pattern, auto_uppercase, and visible_when to SDUI spec"
```

---

### Task 12: Manual end-to-end verification

Using the middleend's asset create/edit/delete modals, verify the three features work together.

- [ ] **Step 1: Free ports and start the dev server**

Run:

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; lsof -ti:3001 | xargs kill -9 2>/dev/null
./cli run
```

- [ ] **Step 2: Verify `auto_uppercase`**

1. Navigate to the assets screen and click "Create asset".
2. Type `aapl` in the ticker field.
3. Expected: field shows `AAPL` (live uppercase).

- [ ] **Step 3: Verify `pattern`**

1. With the create asset modal open, type `aapl$` in the ticker field (a `$` is not in the pattern `^[A-Z0-9.\-]+$`).
2. Expected: red border on ticker input, `Create` button click does not dispatch (DevTools Network tab shows no POST to `/api/action`).
3. Clear the `$`. Expected: red border disappears, Create button dispatches.

- [ ] **Step 4: Verify `visible_when` chain**

1. In the create asset modal, `Complex asset` is unchecked by default.
2. Expected: `price_provider` select is visible, `external_ticker` is hidden (no provider selected).
3. Select a provider. Expected: `external_ticker` becomes visible.
4. Check `Complex asset`. Expected: both `price_provider` and `external_ticker` disappear.
5. Uncheck `Complex asset`. Expected: `price_provider` reappears empty; `external_ticker` stays hidden.

- [ ] **Step 5: Verify no regressions**

1. Log out and back in (login form).
2. Open the positions screen, use the asset type filter (Select with `reload` action + URL placeholder).
3. Expected: behaviors unchanged from before.

- [ ] **Step 6: Run full test suite and lint**

Run: `make test`
Expected: all tests pass (Vitest returns exit code 0).

Run: `make lint`
Expected: lint + prettier clean.

- [ ] **Step 7: Commit any final cleanup (if needed)**

If the manual verification surfaces a small fix, commit it separately with a descriptive message. If nothing needs fixing, skip.

---

## Summary

12 tasks, each with tests + implementation + commit. Total scope:

- **New files (2):** `lib/collect-initial-values.ts`, `components/form-state-context.tsx`.
- **Modified files (7):** `components/base/Form.tsx`, `Input.tsx`, `Select.tsx`, `Checkbox.tsx`, `Textarea.tsx`, `RadioGroup.tsx`, `Button.tsx`, `components/action-dispatcher.tsx`, `spec/sdui-base-components.md`.
- **New tests (11):** one per behavior, following the project's TDD pattern.
- **No changes to:** `lib/types/sdui.ts`, `app/api/action/route.ts`, `components/renderer.tsx`, `components/registry.ts`, `spec/sdui-actions.md`.
