# SDUI Custom Components

Custom components are project-specific SDUI types that are not part of the base set documented in `sdui-base-components.md`. They live in `components/custom/` and are registered in `components/registry.ts` alongside the base components.

This file documents the contract the middleend is expected to emit for each custom component in this project. It is the single source of truth. Entries may be marked **[pending implementation]** when the contract is final but the frontend renderer has not been shipped yet.

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
