# SDUI Custom Components

Custom components are project-specific SDUI types that are not part of the base set documented in `sdui-base-components.md`. They live in `components/custom/` and are registered in `components/registry.ts` alongside the base components.

This file documents the contract the middleend is expected to emit for each custom component, attribute, and action in this project. It is the single source of truth. Entries may be marked **[pending implementation]** when the contract is final but the frontend renderer has not been shipped yet.

---

## 1. `line_chart`

Single- or multi-series line chart with time on the x-axis. Used on the portfolio screen's evolution chart. Numeric data plus format tokens drive the rendering.

### 1.1. Library and Context

**Frontend library:** `recharts` (same as legacy `/repos/vk_investment_frontend`). React-native API, composable, bundle cost acceptable (~180 KB gz). Alternatives (`visx`, `nivo`, `Chart.js`, `echarts`, `Tremor`) were evaluated and rejected for the reasons noted in the prior draft of this spec; `recharts` won on familiarity and fit.

**Legacy reference:** `/repos/vk_investment_frontend/src/features/portfolio/components/` — `value-over-time-chart.tsx` and `asset-value-over-time-chart.tsx` implement single and multi-series variants of the same chart. The new frontend inherits the general visual language (legend toggles, muted gridlines, short y-axis tick format) while adopting the SDUI contract below.

### 1.2. Why numbers, not pre-formatted strings

Chart libraries plot from numeric values and compute tick positions from the numeric range. A chart cannot derive ticks from strings like `"$10,500.00"`. For this reason — and only for this reason — the `line_chart` contract breaks the project's general "middleend emits formatted strings" convention: `data` rows are numeric, and tick/tooltip formatting is driven by format tokens that the frontend resolves against the request's `Accept-Language` header. The middleend does not format chart values; it emits the raw numbers plus the tokens that say how to render them.

### 1.3. Props

| Prop            | Type              | Required | Description                                                                                                                                                                                        |
| --------------- | ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`         | string            | no       | Optional chart title rendered above the plot area. Callers typically emit their own `text` header and omit this.                                                                                   |
| `height`        | enum              | no       | `sm` (13rem) / `md` (18rem) / `lg` (24rem). Default `md`.                                                                                                                                          |
| `series`        | `Series[]`        | yes      | One entry per line. A single-series chart sends one entry.                                                                                                                                         |
| `x_axis`        | `{ key, format }` | yes      | Which key of each data row drives the x-axis; and how to format tick labels.                                                                                                                       |
| `y_axis`        | `{ format }`      | no       | How to format y-axis tick labels. If omitted, the frontend picks a sensible default based on the first series' `value_format`.                                                                     |
| `data`          | `Row[]`           | yes      | Array of rows; may be empty to trigger empty state. Each row contains the x-axis key plus one key per series.                                                                                      |
| `show_legend`   | bool              | no       | Whether a legend renders below the chart. Default `false`. When `true`, the legend is interactive: clicking an entry toggles that line's visibility. Non-interactive-but-visible is not supported. |
| `empty_message` | string            | no       | Text rendered in place of the plot when the dataset is empty or has fewer than 2 points. Localized by the middleend.                                                                               |

### 1.4. Sub-types

**`Series`**

| Field          | Type              | Required | Description                                       |
| -------------- | ----------------- | -------- | ------------------------------------------------- |
| `key`          | string            | yes      | Data row field that holds this series' y-values.  |
| `label`        | string            | yes      | Legend/tooltip label. Localized by the middleend. |
| `color`        | `ChartColorToken` | yes      | Color token; frontend maps to a CSS var.          |
| `value_format` | `ValueFormat`     | yes      | How tooltip values for this series are formatted. |

**`Row`**: `Record<string, number | string | null>`. Contains the x-axis key (typically a date string) and one numeric value per series key. Any series key may be `null` to render a gap (equivalent to `connectNulls={false}` in the legacy multi-series chart).

### 1.5. Token Enums

#### `ChartColorToken`

Semantic color slots. Frontend maps them to its CSS variables (`--chart-1`…`--chart-5`).

| Token     | Typical use      |
| --------- | ---------------- |
| `chart_1` | Primary series   |
| `chart_2` | Secondary series |
| `chart_3` | Tertiary         |
| `chart_4` | Fourth           |
| `chart_5` | Fifth            |

Beyond five series the frontend cycles through the palette; the middleend can reuse `chart_1..chart_5` for additional series.

#### `ValueFormat`

Applied to y-axis ticks and tooltip values.

| Token              | Rendering                         |
| ------------------ | --------------------------------- |
| `currency`         | `$1,234.56` (per locale)          |
| `currency_compact` | `$1.5k`, `$2M` (compact notation) |
| `percent`          | `12.34%`                          |
| `percent_signed`   | `+12.34%` / `-5.68%`              |
| `integer`          | `1234`                            |
| `decimal_2`        | `1234.56`                         |
| `raw`              | Default number rendering          |

The frontend picks a currency symbol based on data context (screen-level currency state for single-series charts; per-series currency can be introduced later if a chart needs to mix currencies).

#### `AxisFormat`

Applied to x-axis tick labels.

| Token        | Rendering                                  |
| ------------ | ------------------------------------------ |
| `date`       | Short date per locale (`Apr 14`, `14 abr`) |
| `month_year` | `Apr 2026` / `abr 2026`                    |
| `integer`    | Plain integer                              |
| `raw`        | As-is                                      |

### 1.6. Empty / Insufficient Data

When `data` has fewer than 2 points the frontend does not plot. It renders `empty_message` centered in the plot area; legend (if any) is hidden.

Emit `data: []` plus a localized `empty_message`. Do **not** swap the subtree for a different component — keep the `line_chart` in place so a subsequent `replace`/`refresh` can repopulate it without tree churn.

### 1.7. Example

Single-series portfolio value over time in absolute mode:

```json
{
  "type": "line_chart",
  "id": "chart-value-over-time",
  "props": {
    "height": "md",
    "series": [
      {
        "key": "value",
        "label": "Value",
        "color": "chart_1",
        "value_format": "currency_compact"
      }
    ],
    "x_axis": { "key": "date", "format": "month_year" },
    "y_axis": { "format": "currency_compact" },
    "data": [
      { "date": "2026-01-15", "value": 10500.5 },
      { "date": "2026-02-15", "value": 10800.0 },
      { "date": "2026-03-15", "value": 11250.75 }
    ],
    "empty_message": "Record at least two snapshots to see the chart."
  }
}
```

### 1.8. Frontend Agreements

- Height tokens map to `13rem / 18rem / 24rem`. May be adjusted to fit the design system without changing the contract.
- CSS variables `--chart-1`…`--chart-5` live in `app/globals.css`. Palette confirmed with design before implementation.
- Tooltip shape: `<series.label>: <formatted value>` per series. Tooltip header uses `x_axis.format`.
- Currency awareness: for `currency` / `currency_compact`, the frontend resolves the currency from the surrounding screen state (single-currency screens use the selected currency; multi-currency charts will extend `series` with a `currency` field when needed).
- Locale: the frontend sends `Accept-Language` on every request. Formatters (`Intl.NumberFormat`, `Intl.DateTimeFormat`) use the document locale synced from that header.

### 1.9. Implementation

- `recharts` installed (`pnpm add recharts`).
- CSS variables `--chart-1`…`--chart-5` declared in `app/globals.css` as `oklch()` values.
- Format helpers in `lib/chart-format.ts`: `formatValue` (ValueFormat → Intl.NumberFormat), `formatAxis` (AxisFormat → Intl.DateTimeFormat / Intl.NumberFormat), `chartColorVar` (token → `var(--chart-N)`, cycles past 5 series).
- `components/custom/LineChart.tsx` — `"use client"`. recharts `ResponsiveContainer` + `LineChart` + one `Line` per series, `connectNulls={false}`. Axes use our tick formatters. Custom tooltip renders `<series.label>: <formatted value>` per point. Renders `empty_message` centered when `data.length < 2`.
- Registered as `line_chart` in `components/registry.ts`.

### 1.10. Open Questions

- **Legend interactivity**: legacy supports click-to-hide per series. Not in the current contract. When added, it will be a client-side-only toggle (no middleend round-trip), similar to the earlier-discussed `series_toggle` pattern.
- **Downsampling**: if `data` can exceed ~1000 points (multi-year daily history), the middleend should downsample server-side. The frontend will not decimate beyond what recharts does visually.
- **Polling / live updates**: out of scope for v1. When needed, we'll add a `refresh_interval_seconds` prop and the dispatcher will handle it without breaking SDUI tree identity.

---

## 2. `pie_chart`

Pie / donut chart for categorical allocation. Used by the portfolio allocation view. Numeric slice values plus format tokens drive the rendering; percentages are derived client-side from the currently visible slices.

### 2.1. Why numbers, not pre-formatted strings

Same rationale as `line_chart` §1.2. Pie libraries compute arc angles from numeric slice values, and the legend toggle recomputes visible-slice percentages on the fly. Strings like `"$10,500.00"` would prevent both.

### 2.2. Props

| Prop            | Type          | Required | Description                                                                                                                                                                                                                                             |
| --------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`         | string        | no       | Optional chart title. Metadata — callers typically emit their own `text` header and omit this.                                                                                                                                                          |
| `height`        | enum          | no       | `sm` (13rem) / `md` (18rem) / `lg` (24rem). Default `md`. Same tokens as `line_chart.height`.                                                                                                                                                           |
| `shape`         | enum          | no       | `pie` / `donut`. Default `donut`. `donut` renders with a central hole; `pie` is a full pie.                                                                                                                                                             |
| `value_format`  | `ValueFormat` | yes      | Applied to slice values in tooltip and legend. Percentages are always rendered as `"xx.x%"` separately.                                                                                                                                                 |
| `slices`        | `Slice[]`     | yes      | Array of slices. Ordered by the middleend. May be empty to trigger the empty state.                                                                                                                                                                     |
| `show_legend`   | bool          | no       | Whether a legend renders. Default `true`. When `true`, the frontend renders it as interactive (clicking an entry toggles that slice's visibility; percentages recompute across remaining visible slices). Non-interactive-but-visible is not supported. |
| `empty_message` | string        | no       | Text rendered in place of the chart when `slices` is empty. Localized by the middleend.                                                                                                                                                                 |

### 2.3. Sub-types

**`Slice`**

| Field   | Type              | Required | Description                                                                                                            |
| ------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `key`   | string            | yes      | Stable identifier, unique within this chart. Used as the React key and the legend / tooltip join.                      |
| `label` | string            | yes      | Legend / tooltip label. Localized by the middleend.                                                                    |
| `value` | number            | yes      | Slice magnitude (in `value_format` units). Slices with `value <= 0` are filtered out by the frontend before rendering. |
| `color` | `ChartColorToken` | yes      | Color token (`chart_1`..`chart_5`, cycling beyond 5).                                                                  |

### 2.4. Middleend responsibilities (out of the component contract)

These belong to whichever handler composes the pie chart, not to the component props. Listed here so every handler converges on the same conventions:

- **Ordering**: emit `slices` sorted by `value` descending; ties broken by `key` ascending.
- **"Other" bucket**: if the long tail of small slices is visually noisy, the handler may pool slices below a chosen threshold into a single `{ key: "other", label: <localized "Other">, value: <sum>, color: "chart_5" }` entry. Threshold is per-handler, not a component prop.
- **Max slices**: same — the handler caps. The component does not truncate.

### 2.5. Percentage calculation (frontend)

The frontend sums the `value` of currently visible slices (those not hidden via the legend toggle) and computes each slice's share as `slice.value / visible_total * 100`. Hiding a slice recomputes all remaining percentages so they sum to 100%. No middleend round-trip.

### 2.6. Empty state

When `slices` is empty (after the frontend's `value > 0` filter), render `empty_message` in the plot area; the legend is hidden regardless of `show_legend`. Keep the `pie_chart` in the tree — do not swap it for a different component — so later `replace` / `refresh` flows can repopulate it.

### 2.7. Out of v1 scope

- **Drill-down via slice click** — a per-slice `action` can be added as an optional `Slice.action` later. Not emitted in v1.

### 2.8. Example

Allocation donut by asset:

```json
{
  "type": "pie_chart",
  "id": "chart-allocation",
  "props": {
    "height": "md",
    "shape": "donut",
    "value_format": "currency_compact",
    "show_legend": true,
    "slices": [
      { "key": "AAPL", "label": "AAPL", "value": 12500, "color": "chart_1" },
      { "key": "MSFT", "label": "MSFT", "value": 8200, "color": "chart_2" },
      { "key": "BTC", "label": "BTC", "value": 4300, "color": "chart_3" },
      { "key": "CASH", "label": "Cash", "value": 2000, "color": "chart_4" }
    ],
    "empty_message": "No positions with known value."
  }
}
```

### 2.9. Implementation

- `components/custom/PieChart.tsx` — `"use client"`. recharts `PieChart` + `Pie` + `Cell` (one per slice). Donut uses `innerRadius="55%"`, pie uses `innerRadius={0}`; both use `outerRadius="75%"`.
- Custom tooltip shows `<label>`, `<formatted value>`, and `<percentage>`. `formatValue` reused from `lib/chart-format.ts`.
- Legend rendered as a flex-wrap list of buttons below the chart. Hidden-slice state kept in `useState<Set<string>>`; hidden entries drop to ~35% opacity (matching legacy).
- Slices with `value <= 0` filtered out before rendering. Empty result hides the legend and renders `empty_message` centered.
- Registered as `pie_chart` in `components/registry.ts`.

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

### 3.3. Presentation

The middleend emits a bare `wizard` component — it is **not** wrapped in a `modal`. The frontend is responsible for presenting it. When the wizard lives in a [modal slot](sdui-base-components.md#modal-slot-pattern) (e.g. `snapshots-modal-slot`), the slot's overlay container renders it as a dialog on desktop or a drawer/sheet on mobile. When placed inline as a child of a screen's content tree, the frontend renders it inline. The `dismiss_action` is the wizard's contract for "the user closed it" — typically `components.Dismiss()`, which the frontend interprets as "close the overlay" or "remove from the tree."

### 3.4. Step indicator

Above the step content: `Step X of Y` counter and a chip row with each step's `label`. Chips are clickable — direct jump between steps. **Forward chip-jumps gate on the active step's validation (parity with Next); backward chip-jumps never validate (parity with Back).**

### 3.5. Buttons by kind

| `kind` (and modifier)       | Buttons (in order)           |
| --------------------------- | ---------------------------- |
| `info`                      | Dismiss, Next                |
| `entry`, `skippable: true`  | Dismiss, Back, Skip, Include |
| `entry`, `skippable: false` | Dismiss, Back, Update        |
| `summary`                   | Dismiss, Back, Submit        |

`Back` is omitted on the first step and on all `info` steps regardless of position. `mode` is informational only in v1 — copy is fixed English regardless.

### 3.6. Include map

The wizard maintains an internal `{stepId → boolean}` seeded from each step's `include_default`. Mutations:

- **Skip** → `included = false`, advance.
- **Include** → validate, `included = true`, advance.
- **Update** (edit mode on pre-existing entry, `skippable: false`) → validate, `included = true` (unchanged), advance.

Excluded entry steps do NOT contribute inputs to the submit payload.

### 3.7. Navigation and validation

| Action     | Validates active step? | Advances?                  |
| ---------- | ---------------------- | -------------------------- |
| Back       | no                     | back one                   |
| Next       | yes                    | forward one                |
| Skip       | no                     | forward one                |
| Include    | yes                    | forward one                |
| Update     | yes                    | forward one                |
| Chip click | yes (forward only)     | direct jump                |
| Submit     | no                     | dispatches `submit_action` |

Validation uses the standard input props (`required`, `pattern`, `min`, `max`, `max_length`). The wizard does not invent a separate validation layer.

### 3.8. Summary

The server's `summary` step children are typically a short descriptive text (e.g. "Review and submit"). Below that, the frontend renders a derived list of included entries: one row per `kind=entry` step where `includeMap[id] === true`, showing `step.label` and an Edit button that chip-jumps to that step. The list is reactive to include-map changes triggered by chip-jumping back to entry steps.

### 3.9. Submit

1. Wizard collects inputs from:
   - All `kind=info` steps (always included).
   - All `kind=entry` steps where `includeMap[id] === true`.
2. Builds the form body using each input's `name` (the wizard does NOT impose a schema — it uses whatever names the server emits; bracket notation per asset is the suggested convention for entry inputs, e.g. `entries[<asset_id>].mode`).
3. Dispatches `submit_action` with the body via the standard action dispatcher (`/api/action`).

There is NO client-side validation gate on Submit. If the user chip-jumps over invalid steps, the backend returns 422 and re-emits the wizard with banner `variant: error` and `initial_step_id` pointing at the broken step.

### 3.10. Dismiss

Wizard handles `dismiss_action`:

- `type: "dismiss"` → calls `useModal()?.close()`. When the wizard is inside a [modal slot](sdui-base-components.md#modal-slot-pattern) (the typical case), the slot's overlay context closes the slot. When outside any modal context, this is a silent no-op. **This is the recommended shape** (`components.Dismiss()` on the BE).
- `type: "replace"` with `tree: <subtree>` → calls `setOverride(target_id, tree)`.
- `type: "replace"` with `tree: null` (or absent) → calls `clearOverride(target_id)`. Equivalent to the `dismiss` shape but explicit about the target.
- Otherwise: falls through to `dispatch(endpoint, method)` (no body).

### 3.11. BE validation error (422)

The middleend returns an `ActionResponse` with `action: "replace"`, `target_id` matching the wizard's container, and `tree` being the same wizard re-emitted with:

- Inputs pre-loaded (via `default_value`).
- A `banner` of `variant: "error"` describing the problem.
- Optional `initial_step_id` pointing at the step that needs attention.

When the override is applied, the new wizard tree replaces the old one. React unmounts the prior wizard and mounts the new one; `useState` initializers re-run, so the include map and active step come from the re-emitted definition.

### 3.12. Implementation

- **React**: `WizardComponent` -- `components/custom/Wizard.tsx`. Splits into outer `WizardComponent` (installs `FormStateProvider` with initial values collected from ALL steps' children) and inner `WizardInner` (state machine + render).
- **Sub-components**: `WizardStepIndicator`, `WizardBanner`, `WizardSummaryEntries` — all in `components/custom/`.
- **"use client"**: Yes (uses `useState`, `useFormState`, `useActionDispatcher`, `useOverrideMap`).
- **Renders**: `<div data-sdui-id={wizardId} data-sdui-form="true">` containing title, step indicator, optional banner, one container per step (`<div data-step-id data-sdui-id data-included hidden>`), and the button row.

---

## 4. `file_upload`

Drag-and-drop + click-to-browse file picker with local validation. Generic — used for the Import & Export screen (AI Import upload, Restore upload), and reusable by any future flow that needs a file inside a multipart submit.

### 4.1. Why custom

The base SDUI catalog has no `input` variant for files. Browsers do not let JavaScript programmatically reattach a previously-picked `File` across re-renders, and SDUI re-renders are server-driven — so a custom component that owns local file state, drag-and-drop affordances, and pre-submit validation (size, format) is the cleanest way to model file inputs without leaking browser-specific quirks into every consumer.

### 4.2. Props

| Prop                   | Type   | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                 | string | yes      | Multipart field name on submit (e.g. `"file"`).                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `label`                | string | yes      | Visible label rendered above the dropzone. Localized by the middleend.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `placeholder`          | string | yes      | Dropzone copy when no file is selected (e.g. _"Drop a file here or click to browse"_). Localized.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `hint`                 | string | no       | Auxiliary copy beneath the dropzone (formats / size limit). Localized.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `accept`               | string | no       | Comma-separated extensions / MIME types (e.g. `".csv,.tsv,.xlsx"`). Drives the native `<input type="file" accept>` and the local format check. Absent → any file.                                                                                                                                                                                                                                                                                                                                      |
| `max_size_bytes`       | int    | no       | Local size limit in bytes. When the user picks a larger file, the component renders `error_message_size` inline and clears the selection. Absent → no local limit.                                                                                                                                                                                                                                                                                                                                     |
| `error_message_size`   | string | no       | Localized message when `max_size_bytes` is exceeded. May contain `{limit}` rendered as a human-readable size (e.g. "5 MB").                                                                                                                                                                                                                                                                                                                                                                            |
| `error_message_format` | string | no       | Localized message when the file's extension / MIME type doesn't match `accept`.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `prefill_filename`     | string | no       | When set, the dropzone renders in the "file selected" state with this filename **but no actual `File` behind it** — purely informational. Used by the middleend when re-emitting a form after a server-side error. To re-submit, the user must re-pick the file (browsers do not let JS reattach a previously-picked file). The dropzone signals this state with the small caption from `reattach_hint`. A change to `prefill_filename` resets local file/error state so the next render starts clean. |
| `reattach_hint`        | string | no       | Localized small caption shown alongside `prefill_filename` (e.g. "Re-select the file to retry").                                                                                                                                                                                                                                                                                                                                                                                                       |

### 4.3. Frontend behavior

- Render: dashed-bordered dropzone (~10rem tall) with the `upload` icon centered and the placeholder text below. When a file is selected, the placeholder is replaced by the filename (`font-mono` truncation if long). Hover / drag-over / focus states match the design system's other interactive controls (border switches to `border-accent-primary` on drag-over, `border-status-error` when an inline error is shown).
- The native `<input type="file">` is hidden but rendered with `name`. Click on the dropzone forwards to `inputRef.click()`. Drop events `preventDefault` on `dragover` and read `dataTransfer.files[0]` on `drop`. The dropzone is keyboard-activatable (`Enter` / `Space`).
- On a new file selection: run the format check against `accept` (if set), then the size check against `max_size_bytes` (if set). On failure, render the corresponding error inline beneath the dropzone (replacing `hint`) and do **not** retain the file (the underlying `<input type="file">.files` is cleared via a fresh `DataTransfer`). On success, the file remains in the input's `FileList` so `collectFormData` can read it at submit time.
- On `submit` of the enclosing form: contributes its file to the `multipart/form-data` body under `name`. `collectFormData` (in `components/action-dispatcher.tsx`) detects `input[type="file"]` inside the form container and reads `input.files[0]`. If any value in the collected data is a `File`, `useActionDispatcher` switches to the multipart code path: `POST /api/action-multipart` with a `FormData` body that includes `__endpoint`, `__method`, and every collected field; the `/api/action-multipart` Route Handler proxies the multipart upstream to the middleend with the same auth headers as `/api/action`. JSON-only submits keep using `/api/action`.
- The component does **not** own form-level disabling. If no file is present, the form-level submit button must be disabled by the consumer (e.g. by emitting the button with `disabled: true` while the form has no file). Submitting without a file results in the file simply being absent from the multipart body — middleend behavior on missing file is its concern.
- A fresh `replace` from the server (matching `id`) clears any local file and any local error. `prefill_filename` lets the server hint at the previously-uploaded filename for context.

### 4.4. Example

```json
{
  "type": "file_upload",
  "id": "import-file",
  "props": {
    "name": "file",
    "label": "File",
    "placeholder": "Drop a file here or click to browse",
    "hint": "CSV, TSV, XLS, XLSX, TXT — max 5 MB",
    "accept": ".csv,.tsv,.xls,.xlsx,.txt",
    "max_size_bytes": 5242880,
    "error_message_size": "File exceeds the {limit} limit.",
    "error_message_format": "Unsupported file format."
  }
}
```

### 4.5. Implementation

- **React**: `FileUploadComponent` — `components/custom/FileUpload.tsx`
- **"use client"**: Yes (uses `useState`, `useRef`, `useEffect`).
- **Renders**: outer `<div data-sdui-id={component.id}>` containing the optional `<label>`, the dropzone `<div role="button">`, the hidden `<input type="file" name>`, and the error/hint paragraph. The hidden input's `FileList` is the source of truth at submit time — local state is for visual feedback only.

---

## 5. `analysis_chat`

Self-contained streaming chat surface for the Analysis screen. Opens an SSE channel to a configured endpoint on mount, captures `session_id` from the first SSE event, appends `delta` events to the last assistant message, and accepts follow-up messages that open new SSE channels. Renders markdown in assistant messages and plain text in user messages.

### 5.1. Why custom

- SSE attachment via `fetch` + `ReadableStream`, kept alive across local re-renders. (`EventSource` does not support custom headers, so the standard SDUI auth cookie cannot ride that path.)
- Incremental append: `delta` events extend the last assistant message in-place without a server SDUI round-trip per chunk.
- Markdown render in assistant messages (remark-gfm) + `whitespace: pre-wrap` in user messages.
- Streaming cursor (blinking) while a response is in flight.
- Auto-scroll on every new chunk.
- Local `session_id` state captured from the first SSE `session` event, used to fill the `{session_id}` placeholder in `followup_endpoint`.
- Error-mode bifurcation (recoverable vs terminal) with input gating, all client-side.

### 5.2. Props

| Prop                   | Type                | Required | Description                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initial_endpoint`     | string              | yes      | URL the component opens an SSE channel to on mount. The first event must be `session` carrying `session_id`; subsequent events are `delta`, then `done` or `error`. Middleend exposes this as `GET /actions/analysis/stream` (with `?focus=<encoded>` when focus is set). |
| `followup_endpoint`    | string              | yes      | URL template for follow-up messages. Must contain `{session_id}`, substituted at send time using the captured id. Sent as `POST` with body `{content}`, handled as another SSE stream. Middleend path: `/actions/analysis/sessions/{session_id}/messages`.                |
| `placeholder`          | string              | yes      | Text displayed in the input when empty. Localized.                                                                                                                                                                                                                       |
| `submit_label`         | string              | yes      | Aria-label for the icon-only send button. Localized.                                                                                                                                                                                                                     |
| `streaming_label`      | string              | no       | Small muted text rendered alongside the blinking cursor while a response is streaming. If absent, only the cursor renders. Localized.                                                                                                                                    |
| `max_input_length`     | int                 | no       | Maximum characters allowed in the input. Default `2000`.                                                                                                                                                                                                                 |
| `error_messages`       | map<string, string> | yes      | Map of error code to localized message. Must include `default` as fallback. Codes: `ANALYSIS_SESSION_NOT_FOUND`, `ANALYSIS_SESSION_EXPIRED`, `ANALYSIS_TOO_MANY_MESSAGES`, `ANALYSIS_FOCUS_TOO_LONG`, `AI_PROVIDER_UNAVAILABLE`, `AI_RATE_LIMITED`, `AI_TIMEOUT`, `AI_CONTEXT_TOO_LARGE`, `RATE_LIMITED`, `INTERNAL_ERROR`, `default`. |
| `terminal_error_codes` | string[]            | yes      | Codes that transition the component into terminal mode (input disabled + CTA visible). Recommended: `["ANALYSIS_SESSION_EXPIRED", "ANALYSIS_SESSION_NOT_FOUND", "ANALYSIS_TOO_MANY_MESSAGES"]`.                                                                          |
| `terminal_cta_label`   | string              | yes      | Label for the CTA button in terminal mode. Localized.                                                                                                                                                                                                                    |
| `reset_action`         | SDUIAction          | yes      | Action executed by the terminal CTA. Typically `reload` against `/actions/analysis/reset` with `target_id="analysis-content"`.                                                                                                                                          |

### 5.3. SSE event protocol

The component consumes the backend's SSE event names unchanged — the middleend proxy is a transparent relay:

| Event     | Payload                            | Component behavior                                                                                                                                                                                                                              |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session` | `{ session_id: string }`           | Stash `session_id` into local state. Append a placeholder assistant message. Show streaming cursor.                                                                                                                                             |
| `delta`   | `{ text: string }`                 | Append `text` to the last assistant message's content. Auto-scroll to bottom.                                                                                                                                                                   |
| `done`    | `{}`                               | Hide cursor on the last message. Re-enable input.                                                                                                                                                                                               |
| `error`   | `{ code: string, message: string }` | Render an inline error banner above the input with `error_messages[code] ?? error_messages["default"]`. If `code ∈ terminal_error_codes`: disable input, show CTA. Otherwise: keep input enabled. Remove the empty placeholder assistant message if it never received any delta. |

Connection-level errors (network drop, fetch abort that wasn't user-initiated) are surfaced internally as `error` with `code: "INTERNAL_ERROR"`. The middleend also emits this code when the upstream connection drops mid-stream.

### 5.4. Frontend behavior

1. **Mount**: open SSE to `initial_endpoint` (via the auth-aware proxy `/api/action-stream`). Initialize `messages: []`, `session_id: null`, `is_streaming: true`, `error: null`, `is_terminal: false`. As soon as the first `session` event arrives, stash `session_id` and push a placeholder assistant message (`{role: "assistant", content: ""}`).
2. **Streaming render**: messages list scrolls automatically. Each `delta` appends and triggers scroll-to-bottom.
3. **`done`**: clear cursor; `is_streaming = false`.
4. **Send follow-up** (Enter without Shift, or Send button):
   - Validate: trimmed length > 0 and ≤ `max_input_length`.
   - Push `{role: "user", content}`; push `{role: "assistant", content: ""}`.
   - Open SSE to `followup_endpoint` with `{session_id}` resolved (via the existing `substitutePlaceholders` helper), `POST`, body `{content}`.
   - Same `delta`/`done`/`error` loop.
5. **Error inline**: banner above the input area. Persists until the next send (recoverable) or terminal-CTA click.
6. **Terminal mode**: input disabled, send button disabled, banner persists, `terminal_cta_label` button rendered below the banner. Clicking executes `reset_action` via the standard `useActionDispatcher`.
7. **Markdown**: assistant messages via `react-markdown` + `remark-gfm` (tables, lists, code blocks, headings). User messages: plain text with `whitespace: pre-wrap`.
8. **Character counter**: bottom-right of input, only when `value.length / max_input_length >= 0.75`. Format `<current> / <max>`. Destructive color when over.
9. **Disconnection**: fetch aborts (network drop, navigation) → surface as `INTERNAL_ERROR` recoverable.
10. **Enter-to-send**: Enter (no Shift, no IME composition) invokes Send; Shift+Enter inserts newline.
11. **Unmount cleanup**: on unmount the component aborts any in-flight fetch+SSE before being torn down. Prevents leaked connections.

### 5.5. Layout

- **Outer**: column flex, fills available height of the parent slot.
- **Messages area**: `flex: 1`, `overflow-y: auto`, centered max-width container; user bubbles right-aligned (`max-width: 85%`, primary background, rounded), assistant bubbles left-aligned with `prose` styling for markdown.
- **Input area**: pinned bottom, border-top separator, padding; centered max-width row containing `[textarea, send-button]`. Textarea auto-resizes between 1 and ~4 rows. Send button is icon-only (send icon).
- **Error banner**: between messages and input when `error` is set.
- **Terminal CTA**: below the error banner when in terminal mode.

### 5.6. Auth

`EventSource` does not support custom headers, so the auth cookie cannot ride that path. The component uses `fetch` + `ReadableStream`, routed through the auth-aware proxy at `/api/action-stream`. The proxy reads the HttpOnly token cookie and attaches `Authorization: Bearer …` server-side, then streams the upstream SSE response back unchanged. See [`sdui-actions.md` §4](sdui-actions.md) for the proxy pattern; the streaming proxy follows the same conventions.

### 5.7. Example

```json
{
  "type": "analysis_chat",
  "id": "analysis-chat",
  "props": {
    "initial_endpoint": "/actions/analysis/stream?focus=risk%20exposure",
    "followup_endpoint": "/actions/analysis/sessions/{session_id}/messages",
    "placeholder": "Ask a follow-up question…",
    "submit_label": "Send",
    "streaming_label": "AI is thinking…",
    "max_input_length": 2000,
    "error_messages": {
      "ANALYSIS_SESSION_NOT_FOUND": "Session not found.",
      "ANALYSIS_SESSION_EXPIRED": "Session expired. Start a new analysis.",
      "ANALYSIS_TOO_MANY_MESSAGES": "Conversation length limit reached. Start a new analysis.",
      "ANALYSIS_FOCUS_TOO_LONG": "Focus area is too long.",
      "AI_PROVIDER_UNAVAILABLE": "AI provider unavailable. Please retry.",
      "AI_RATE_LIMITED": "AI rate limit reached. Please retry shortly.",
      "AI_TIMEOUT": "AI request timed out. Please retry.",
      "AI_CONTEXT_TOO_LARGE": "Portfolio context is too large for the AI.",
      "RATE_LIMITED": "Too many requests. Please wait a moment before trying again.",
      "INTERNAL_ERROR": "Connection lost. Please try again.",
      "default": "Something went wrong. Please retry."
    },
    "terminal_error_codes": [
      "ANALYSIS_SESSION_EXPIRED",
      "ANALYSIS_SESSION_NOT_FOUND",
      "ANALYSIS_TOO_MANY_MESSAGES"
    ],
    "terminal_cta_label": "Start a new analysis",
    "reset_action": {
      "trigger": "click",
      "type": "reload",
      "endpoint": "/actions/analysis/reset",
      "target_id": "analysis-content",
      "loading": "section"
    }
  }
}
```

### 5.8. Implementation

- **React**: `AnalysisChatComponent` — `components/custom/AnalysisChat.tsx`
- **"use client"**: Yes (uses `useState`, `useEffect`, `useRef`, `useActionDispatcher`).
- **Renders**: outer `<div data-sdui-id={component.id}>` with column flex layout. Mounts an `AbortController` per stream. Renders messages via `react-markdown` (assistant) or plain `<div>` (user). Inline SSE parser (`event:` / `data:` lines, blank-line delimited) handles the response stream.

---

## 6. Custom Attributes

Project-specific props that may appear on any component. The frontend reads them alongside base shared props (`align_items`, `gap`, etc.) and applies project-specific behavior.

### `sensitive`

Available on any component. When `true`, the frontend masks the component's visible content with `"••••"` while the HideValues toggle is active. The middleend decides **what** is sensitive; the frontend decides **when** to mask.

Not all monetary values are sensitive. The rule:

| Sensitive (`true`)                                                                                                 | Not sensitive                                    |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Absolute monetary values: Total Value, Total P&L, Avg Cost, Total Cost, Market Value, Unrealized P&L, Realized P&L | Percentages: Performance, Snapshot Change, % P&L |
|                                                                                                                    | Counts: Open Positions, Quantity                 |
|                                                                                                                    | Metadata: Ticker, Name, Type, Last Snapshot      |

The frontend must not infer sensitivity from the value's format or color — only from the explicit `sensitive: true` prop.

```json
{
  "type": "text",
  "id": "summary-value-total-value-USD",
  "props": {
    "content": "$12,345.67",
    "size": "xl",
    "weight": "bold",
    "sensitive": true
  }
}
```

When HideValues is active, the frontend renders `"••••"` instead of `"$12,345.67"`. The original `content` stays in the tree — the frontend just visually replaces it.

**Implementation:** `ComponentRenderer` in `components/renderer.tsx` wraps sensitive components in `<SensitiveMask>` (a client component that reads from `SensitiveProvider`). When `hideValues` is true, the mask renders `"••••"` (with `select-none`); otherwise it passes children through.

---

## 7. Custom Actions

Project-specific action types that extend the base set in `sdui-actions.md`. The frontend maps these types to local behavior; no server round-trip is involved.

### `toggle_sensitive`

Toggles the visibility of all components marked with `sensitive: true`. Fired by the HideValues `icon_toggle`. No `endpoint` or `target_id` — purely client-side.

```json
{
  "trigger": "click",
  "type": "toggle_sensitive"
}
```

When the frontend receives this action:

1. Flip the local `hideValues` boolean state (in `SensitiveProvider`).
2. All components with `sensitive: true` in the current screen tree are masked (`"••••"`) or unmasked based on the new state.
3. No HTTP request is made.

The `icon_toggle` for HideValues carries this action in both slots (the action is the same regardless of direction):

```json
{
  "type": "icon_toggle",
  "id": "hide-values-toggle",
  "props": {
    "active": false,
    "icon_inactive": "eye",
    "icon_active": "eye-off",
    "tooltip_inactive": "Hide values",
    "tooltip_active": "Show values"
  },
  "actions": [
    { "trigger": "click", "type": "toggle_sensitive" },
    { "trigger": "click", "type": "toggle_sensitive" }
  ]
}
```

**Implementation:** `Button` and `IconToggle` both handle `toggle_sensitive` via the `SensitiveProvider.toggleSensitive()` function. `IconToggle` uses a `CLIENT_ACTIONS` map that dispatches client-only actions (both `toggle_theme` and `toggle_sensitive`) without hitting the server.
