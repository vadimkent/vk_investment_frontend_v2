# SDUI form capabilities — `pattern`, `auto_uppercase`, `visible_when`

**Date:** 2026-04-18
**Status:** design
**Scope:** frontend support for three new SDUI contract additions emitted by the middleend. (A fourth addition, URL placeholders, is already implemented — see `lib/url-placeholders.ts` and `spec/sdui-actions.md § 2a`.)

## Problem

The middleend adds three client-side capabilities to the SDUI contract:

1. **`input.pattern`** — regex validation on every `input` component.
2. **`input.auto_uppercase`** — auto-transform user typing to uppercase.
3. **`visible_when`** — reactive visibility in form components (`input`, `select`, `checkbox`, `textarea`, `radio_group`) based on the current value of another field in the same form.

Together they unlock the asset create / edit / delete modals in the middleend (`internal/assets/modal_builder.go`). The frontend must support all three before those flows are usable.

### Current state

- `Form` is a dumb `<div>` with `data-sdui-id` — no reactive state across its children.
- `Input` is uncontrolled (`defaultValue`), has no `pattern` / `auto_uppercase` props, and reports no validity signal.
- Form components do not talk to each other — each renders independently and form data is collected from the DOM at submit time.

## Goals

- Support the three additions per the middleend spec.
- No regressions on existing forms (login, filters, non-reactive forms).
- Keep submit-time form collection DOM-based (no migration to controlled inputs for submission).
- Fail-safe defaults when the middleend misconfigures an action (unknown field name, invalid regex, `visible_when` outside a form).

## Non-goals

- Compound visibility expressions (`and` / `or`). The spec explicitly punts these back to the middleend via round-trips.
- Form-level validation beyond pattern (length, cross-field). Not requested.
- Controlled inputs for submission. Collection stays DOM-based via `collectFormData`.

---

## Architecture

Three independent but coordinated changes:

1. **`FormStateContext`** — new client-side reactive store, provided by `Form`, consumed by the 5 form components for `visible_when` reactivity.
2. **`Input` enhancements** — local state for pattern validity + `onInput` transform for `auto_uppercase`.
3. **Submit blocking** — DOM scan in every dispatcher (Button, Select, Checkbox, RadioGroup) before sending a `submit` action.

The three features are orthogonal in implementation but share one data structure (`data-sdui-invalid` attribute) and one concept (fields published to the form context).

### New files

- `components/form-state-context.tsx` — `FormStateProvider`, `useFieldValue(name)`, `useFormState()`, plus the pure helper `evalVisibleWhen(vw, value)`.
- `lib/collect-initial-values.ts` — `collectInitialValues(tree: SDUIComponent): Record<string, unknown>` walks the tree once and returns every named form field's default value.

### Modified files

- `components/base/Form.tsx` — compute initial values from children, wrap in `FormStateProvider`.
- `components/base/Input.tsx` — read `pattern` / `auto_uppercase` / `visible_when`; compile regex; `onInput` / `onBlur` handlers; publish to form context; respect `visible_when`; emit `data-sdui-invalid` on invalid.
- `components/base/Select.tsx` — publish to form context on change; respect `visible_when`; respect submit blocking when `target_id` present.
- `components/base/Checkbox.tsx` — publish to form context on change; respect `visible_when`; respect submit blocking when `target_id` present.
- `components/base/Textarea.tsx` — publish to form context on change; respect `visible_when`. (No pattern/auto_uppercase — spec says those are input-only.)
- `components/base/RadioGroup.tsx` — publish to form context on change; respect `visible_when`; respect submit blocking when `target_id` present.
- `components/base/Button.tsx` — in `submit` case, call `hasInvalidFields(target_id)` before dispatch; abort + focus first invalid if true.
- `components/action-dispatcher.tsx` — export `hasInvalidFields(targetId)`.
- `spec/sdui-base-components.md` — add rows for `input.pattern`, `input.auto_uppercase`; add final section "Form component visibility: `visible_when`".

### No changes

- `lib/types/sdui.ts` — `SDUIComponent.props` is `Record<string, unknown>`, covers new props without type updates.
- `spec/sdui-actions.md` — URL placeholders already documented.
- `app/api/action/route.ts`, `components/renderer.tsx`, `components/registry.ts` — untouched.

---

## Design: `FormStateContext`

### Contract

```ts
interface FormStateContextValue {
  getValue: (name: string) => unknown;
  setValue: (name: string, value: unknown) => void;
  subscribe: (name: string, cb: () => void) => () => void;
}
```

Default context (used when no provider is above): `getValue` returns `undefined`, `setValue` / `subscribe` are no-ops. `useFormState()` returns `null` outside a provider so consumers can distinguish "no form" from "in form, field not set yet" and fail open (always visible) when not in a form. See "Usage in form components" below.

### Store implementation

Internal to the provider, a plain mutable store:

```ts
const values = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
```

`setValue` writes to the map and notifies only listeners of that field name. Consumers use `useSyncExternalStore` with a per-field `subscribe` so re-renders are scoped to subscribers of the changed field — a checkbox toggling `is_complex` only re-renders the components subscribed to `is_complex`.

### Initial values

`FormComponent` passes an `initial: Record<string, unknown>` to the provider, computed via `collectInitialValues(component)`:

- Recursively walks `component.children`.
- For each node whose type is one of `input, select, checkbox, textarea, radio_group`, reads the relevant default prop (`default_value`, `checked`, etc.) and records it under `props.name`.
- Stops descending into `modal` / `form` children of other forms (defensive — nested forms unlikely).

The provider seeds `values` with `initial` synchronously on mount. `visible_when` components reading in their first render see correct defaults — no initial-render flicker.

### Consumer API

```ts
const value = useFieldValue(name); // subscribes, returns current value
```

A tiny hook backed by `useSyncExternalStore`. Returns `undefined` if the name was never registered.

### `evalVisibleWhen`

Pure function, no React:

```ts
type VisibleWhen = { field: string; op: "eq" | "ne"; value: unknown };

function evalVisibleWhen(vw: VisibleWhen, value: unknown): boolean {
  switch (vw.op) {
    case "eq":
      return value === vw.value;
    case "ne":
      return value !== vw.value;
    default:
      return true; // unknown op → fail open
  }
}
```

Strict equality matches the spec's simple semantics. The middleend emits `string`, `bool`, or `number` in `value`, so `===` works for all three without coercion.

### Usage in form components

Each of the 5 components adds at the top of its body:

```tsx
const formCtx = useFormState(); // null outside a form
const vw = component.props.visible_when as VisibleWhen | undefined;
const depValue = useFieldValue(vw?.field ?? "");
if (vw && formCtx && !evalVisibleWhen(vw, depValue)) return null;
```

The `formCtx && ...` guard makes `visible_when` a no-op outside a `Form` (fail open). Inside a `Form`, the evaluation runs with real values.

Unmounting (returning `null`) means:

- The input is not in the DOM → `collectFormData` skips it automatically.
- Any typed value is discarded. Matches spec: "hidden components do not contribute to form data".
- Re-showing the field starts from its `default_value` (inputs remount fresh). Acceptable because the user never interacted with a hidden field.

Each component also publishes its value on every change via `useFormState().setValue(name, value)`. The publish happens inside the existing change handlers (onChange for checkboxes, onValueChange for Select, etc.).

---

## Design: `input.pattern` + `input.auto_uppercase`

### Props

```ts
const pattern = component.props.pattern as string | undefined;
const autoUppercase = component.props.auto_uppercase === true;
```

### Regex compilation

```tsx
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
```

Invalid regex → `null` → no validation happens → input behaves as if `pattern` was not provided. The middleend sees no error, just no blocking. This is the safest behavior: misconfigured middleend doesn't lock the user out of the form.

### Local state

```tsx
const [invalid, setInvalid] = useState(false);
```

One boolean. We only track "is the current value invalid". No need to track "has the user interacted" — validity is per-value, not per-interaction. We never mark the field invalid on mount (even if `default_value` fails the pattern) because the spec says validate on change/blur.

### Handlers

```tsx
function runChecks(el: HTMLInputElement) {
  if (autoUppercase) {
    const upper = el.value.toUpperCase();
    if (el.value !== upper) el.value = upper;
  }
  if (regex) {
    const v = el.value;
    setInvalid(v !== "" && !regex.test(v));
  }
  formCtx.setValue(name, el.value);
}

<input
  onInput={(e) => runChecks(e.currentTarget)}
  onBlur={(e) => runChecks(e.currentTarget)}
  // ...
/>;
```

Empty value is considered valid by pattern — `required` is a separate concern handled by the existing HTML `required` attribute. The spec also doesn't say pattern implies required.

### Visual state

When `invalid` is true:

- `aria-invalid="true"` on the `<input>`.
- `data-sdui-invalid="true"` on the `<input>` (used by submit blocking).
- Classes: `border-status-error focus-visible:ring-status-error/40`. Replace default `border-border-input` class.

When `invalid` is false, all three removed / not emitted. The attributes and ring follow the single invalid state — no stale markers.

### Interaction with `auto_uppercase`

`auto_uppercase` runs before pattern check, so `pattern: "^[A-Z]+$"` with `auto_uppercase: true` never triggers invalid on lowercase input — the transform moves the value to uppercase first. Explicitly documented in the spec.

---

## Design: Submit blocking

### Helper

```ts
// components/action-dispatcher.tsx
export function hasInvalidFields(targetId: string): boolean {
  const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
  return !!container?.querySelector('[data-sdui-invalid="true"]');
}
```

### Button

```tsx
case "submit":
  if (action.endpoint) {
    if (action.target_id && hasInvalidFields(action.target_id)) {
      const container = document.querySelector(`[data-sdui-id="${action.target_id}"]`);
      container
        ?.querySelector<HTMLElement>('[data-sdui-invalid="true"]')
        ?.focus();
      return;
    }
    const data = action.target_id ? collectFormData(action.target_id) : {};
    const endpoint = substitutePlaceholders(action.endpoint, placeholders);
    await dispatch(endpoint, action.method ?? "POST", data, {
      loading: action.loading,
      targetId: action.target_id,
    });
  }
  break;
```

### Other dispatchers

`Select`, `Checkbox`, `RadioGroup` also dispatch submits via `change` triggers. They add the same check, but only when `target_id` is present. Without `target_id`, these emit `{[name]: value}` (single-field submit) and there is no form to validate.

No snackbar. The red border on the invalid input is the feedback. If UX feedback proves insufficient we can add one in a follow-up.

---

## Design: `collectFormData` interaction

No changes. Because hidden fields unmount, they leave the DOM, and `container.querySelectorAll("input[name]")` simply doesn't find them. This matches the spec requirement ("hidden components do not contribute to form data") for free.

Invalid fields are still in the DOM — submit blocking handles them earlier; by the time `collectFormData` runs, we've confirmed all fields are valid.

---

## Edge cases

| Case                                                                        | Behavior                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `visible_when.field` points to a name that no component in the form exposes | `getValue` returns `undefined`. `op:"eq"` with any value → `false` → hidden. `op:"ne"` with any value → `true` → visible. The visibility is determined, not "broken" — middleend authoring error shows up as wrong visibility. |
| Chained visibility: A hides B; B hides C                                    | Works. When A hides B, B unmounts and stops publishing. C subscribes to B's name, gets `undefined`, evaluates accordingly. Each link is reactive.                                                                              |
| Invalid regex in `pattern`                                                  | `new RegExp` throws → caught → regex is `null` → no validation → field always valid. Dev warning logged.                                                                                                                       |
| `default_value` doesn't match `pattern`                                     | Input starts valid. Becomes invalid on first change or blur. Matches spec.                                                                                                                                                     |
| `auto_uppercase` + case-sensitive pattern                                   | Transform runs before regex test → no false invalid.                                                                                                                                                                           |
| User types invalid value, then submits                                      | Button blocks, focuses first invalid input. No server round-trip.                                                                                                                                                              |
| `visible_when` outside any Form                                             | `useFormState()` returns `null` → guard skips the evaluation → component always visible. Non-form uses unaffected.                                                                                                             |
| Two visibility conditions compose via chain                                 | Supported via chaining (see above). Compound `and`/`or` explicitly out of scope per middleend spec.                                                                                                                            |
| Re-showing a field after hiding                                             | Field unmounts on hide → remounts on show. Starts from `default_value`. Previously typed value is lost by design.                                                                                                              |
| `required` + `visible_when`                                                 | If hidden, not in DOM → native `required` validation doesn't fire for it → submit proceeds. Correct (hidden fields are conceptually absent).                                                                                   |

---

## Testing

Manual verification via the asset create/edit/delete modals in the middleend dev environment:

1. **`auto_uppercase`**: type `aapl` in ticker field → renders as `AAPL`.
2. **`pattern`**: type `aa$pl` (with `auto_uppercase` → `AA$PL`) → red border, form submit blocked, focus goes to ticker input on click of Create button.
3. **`visible_when` chain**: toggle "Complex asset" checkbox off → `price_provider` select appears. Select a provider → `external_ticker` input appears. Toggle complex back on → both disappear, don't submit.
4. **Partial form, no regressions**: login form, filter selects on positions screen, toggle interactions — all work unchanged.

Unit tests via the project's existing Vitest + `@testing-library/react` setup (see `tests/`). Each new module (`form-state-context`, `collect-initial-values`) and each behavior added to a component (pattern validation, auto_uppercase transform, visible_when gating, submit blocking) gets a test — following the TDD pattern used in prior plans in this repo.

---

## Risks and mitigations

- **Risk:** `useSyncExternalStore` + manual store has subtle bugs around batching. **Mitigation:** keep it minimal (Map + Set listeners), align with React's documented usage pattern. If issues appear, fall back to a single `useState<Record<string,unknown>>` in the provider (simpler, re-renders all consumers — acceptable for small forms).
- **Risk:** Unmount-on-hide loses user input. **Mitigation:** this is the spec's explicit semantics, not a bug. Document in spec + surface in user testing. If product wants preservation later, switch to `display:none` with a `data-sdui-hidden` attribute — self-contained change.
- **Risk:** Submit blocking on `change` triggers (Select/Checkbox/RadioGroup) could surprise users — they change a field and nothing happens because another field in the form is invalid. **Mitigation:** this is rare (most reactive-change fields in the modal don't have `target_id`). Acceptable; if it becomes a UX issue, dispatch anyway for single-field selects and only block on full form submits.

---

## Open questions

None at design time. All decisions resolved in brainstorming:

- ✅ Scope: single spec/plan covering all three features.
- ✅ Visibility: unmount (not `display:none`).
- ✅ Initial values: pre-computed from tree by `Form` (not lazy-published).
- ✅ Submit blocking: DOM scan via `data-sdui-invalid`.
- ✅ Pattern visual state: only tracked via local `invalid` boolean, not `FormStateContext`.
