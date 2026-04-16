# Dark Mode — Design Spec

## Overview

Add binary light/dark mode switching to the SDUI frontend. A button in the shell sidebar triggers a client-side toggle; the preference persists in localStorage. All visual tokens are expressed as CSS custom properties that flip between two palettes. Components never reference hardcoded Tailwind color classes.

This is a scaffold gap (§10): every project built from the workflow template will need theming, and the scaffold should ship with token infrastructure and dark-ready components.

---

## 1. Token System

### 1.1. CSS Custom Properties

Declared in `app/globals.css` inside `:root` (light) and `.dark` (dark). Values are stored as space-separated RGB channels so Tailwind's opacity modifier works (`bg-surface-primary/50`).

| Token                      | Light (RGB)         | Dark (RGB)          | Semantic purpose                                  |
| -------------------------- | ------------------- | ------------------- | ------------------------------------------------- |
| `--bg-primary`             | `255 255 255`       | `17 24 39`          | Body, cards, modals, tooltips                     |
| `--bg-secondary`           | `249 250 251`       | `31 41 55`          | Table header, hover backgrounds, elevated surface |
| `--bg-muted`               | `243 244 246`       | `55 65 81`          | Disabled inputs, inactive surface                 |
| `--text-primary`           | `17 24 39`          | `249 250 251`       | Primary text                                      |
| `--text-secondary`         | `75 85 99`          | `156 163 175`       | Labels, secondary text                            |
| `--text-muted`             | `156 163 175`       | `107 114 128`       | Placeholders, tertiary text                       |
| `--text-on-accent`         | `255 255 255`       | `255 255 255`       | Text over accent backgrounds (badges, CTA)        |
| `--border-default`         | `229 231 235`       | `55 65 81`          | Card borders, dividers, table borders             |
| `--border-input`           | `209 213 219`       | `75 85 99`          | Input/select/checkbox borders                     |
| `--accent-primary`         | `37 99 235`         | `96 165 250`        | Primary CTA, links, active toggle                 |
| `--accent-primary-hover`   | `29 78 216`         | `147 197 253`       | Primary CTA hover                                 |
| `--status-error`           | `220 38 38`         | `248 113 113`       | Error text, error badges, error borders           |
| `--status-error-surface`   | `254 226 226`       | `69 26 26`          | Error component background                        |
| `--status-success`         | `22 163 74`         | `74 222 128`        | Positive text, success badges                     |
| `--status-warning`         | `202 138 4`         | `250 204 21`        | Warning badges                                    |
| `--overlay`                | `0 0 0`             | `0 0 0`             | Modal backdrop (used with opacity)                |

### 1.2. Tailwind Config Extension

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      surface: {
        primary: "rgb(var(--bg-primary) / <alpha-value>)",
        secondary: "rgb(var(--bg-secondary) / <alpha-value>)",
        muted: "rgb(var(--bg-muted) / <alpha-value>)",
      },
      content: {
        primary: "rgb(var(--text-primary) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        "on-accent": "rgb(var(--text-on-accent) / <alpha-value>)",
      },
      border: {
        DEFAULT: "rgb(var(--border-default) / <alpha-value>)",
        input: "rgb(var(--border-input) / <alpha-value>)",
      },
      accent: {
        primary: "rgb(var(--accent-primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--accent-primary-hover) / <alpha-value>)",
      },
      status: {
        error: "rgb(var(--status-error) / <alpha-value>)",
        "error-surface": "rgb(var(--status-error-surface) / <alpha-value>)",
        success: "rgb(var(--status-success) / <alpha-value>)",
        warning: "rgb(var(--status-warning) / <alpha-value>)",
      },
      overlay: "rgb(var(--overlay) / <alpha-value>)",
    },
  },
},
```

### 1.3. Chart Colors

`--chart-1` through `--chart-5` already use oklch. In `.dark`, bump the lightness channel from ~0.65-0.75 to ~0.75-0.85 to maintain contrast against dark backgrounds. Values stay in `globals.css` alongside the token vars.

---

## 2. ThemeProvider

### 2.1. Component

`components/theme-provider.tsx` — `"use client"`.

```
ThemeContext -> { theme: "light" | "dark", toggle: () => void }
```

- On mount: read `localStorage.getItem("theme")`. If absent, default to `"light"`.
- On toggle: flip the value, write to `localStorage`, add/remove `dark` class on `document.documentElement`.
- Wrap the body in root `app/layout.tsx`, alongside `OverrideMapProvider`.

### 2.2. FOUC Prevention

A blocking inline script in the document head runs before React hydrates. It reads localStorage and applies the `dark` class to `<html>` synchronously, before the first paint. This prevents any visible flash from light to dark. The script is a static string with no external input — no sanitization concern.

### 2.3. Tailwind Config

```ts
darkMode: "class",
```

Enables `.dark` selector for any `dark:` variant (not used by components, but available as escape hatch).

---

## 3. SDUI Action: `toggle_theme`

### 3.1. Contract

New action type handled purely client-side by `ButtonComponent`:

```json
{
  "trigger": "click",
  "type": "toggle_theme"
}
```

No round-trip to the middleend. The middleend places the button wherever it wants (typically `nav_footer` in the shell) and the frontend handles the toggle locally.

### 3.2. Implementation

In `components/base/Button.tsx`, add a case:

```ts
case "toggle_theme":
  toggle(); // from useTheme()
  break;
```

Button imports `useTheme` from the provider.

### 3.3. Spec Update

Add `toggle_theme` to `spec/sdui-actions.md` section 2 action types table:

| Type           | Behavior                                    | Required Fields |
| -------------- | ------------------------------------------- | --------------- |
| `toggle_theme` | Toggles light/dark mode. Client-side only.  | (none)          |

---

## 4. Component Migration

### 4.1. Scope

Every file that currently uses hardcoded Tailwind color classes. Based on the audit:

**Base components (30 files in `components/base/`):**
- Backgrounds: `bg-white` -> `bg-surface-primary`, `bg-gray-50` -> `bg-surface-secondary`, `bg-gray-100` -> `bg-surface-muted`
- Text: `text-gray-900` -> `text-content-primary`, `text-gray-600` -> `text-content-secondary`, `text-gray-400` -> `text-content-muted`
- Text on color: `text-white` (on badges/buttons) -> `text-content-on-accent`
- Borders: `border` (default gray-200) -> `border-border`, `border-gray-300` -> `border-border-input`
- Accent: `bg-blue-600` -> `bg-accent-primary`, `text-blue-600` -> `text-accent-primary`
- Status: `text-red-600` -> `text-status-error`, `text-green-600` -> `text-status-success`, `bg-red-500` -> `bg-status-error`, `bg-green-500` -> `bg-status-success`, `bg-yellow-500` -> `bg-status-warning`
- Overlay: `bg-black bg-opacity-50` -> `bg-overlay/50`

**Custom components (2 files in `components/custom/`):**
- Chart tooltips: `bg-white border` -> `bg-surface-primary border-border`
- Chart empty state text: `text-gray-500` -> `text-content-muted`

**Text.tsx colorStyles map:**
- `primary: "text-content-primary"`, `secondary: "text-content-secondary"`, `muted: "text-content-muted"`, `error: "text-status-error"`, `positive: "text-status-success"`, `negative: "text-status-error"`

### 4.2. What Does NOT Change

- Layout classes (`flex`, `grid`, `rounded-lg`, `p-4`, `gap-2`, etc.) — unrelated to theme.
- Shadow classes (`shadow-sm`, `shadow-md`) — Tailwind shadows use neutral colors that work in both themes.
- Chart color vars (`--chart-1..5`) — already CSS vars, just adjusted for dark luminosity.
- Spacing tokens, shared props, action dispatcher — no color dependency.

### 4.3. Migration Rule

Every hardcoded Tailwind color class (`bg-white`, `text-gray-900`, `border-gray-200`, etc.) is replaced with its semantic token equivalent. If a color doesn't map cleanly to an existing token, a new token is added to the palette — not a hardcoded dark variant.

---

## 5. Files Changed

| File | Change |
| --- | --- |
| `tailwind.config.ts` | Add `darkMode: "class"`, extend colors with semantic tokens |
| `app/globals.css` | Add `:root` and `.dark` CSS var declarations. Adjust chart colors for dark. |
| `app/layout.tsx` | Add FOUC prevention script in head. Wrap body with `ThemeProvider`. |
| `components/theme-provider.tsx` | New. ThemeContext + useTheme hook. |
| `components/base/Button.tsx` | Add `toggle_theme` case. Import `useTheme`. |
| `components/base/*.tsx` (all 30) | Swap hardcoded colors for token classes. |
| `components/custom/LineChart.tsx` | Swap tooltip/empty-state colors. |
| `components/custom/PieChart.tsx` | Swap tooltip/empty-state/legend colors. |
| `components/base/Text.tsx` | Update `colorStyles` map to use tokens. |
| `spec/sdui-actions.md` | Add `toggle_theme` to action types. |
| `SCAFFOLDING_GAPS.md` | Add section 10 documenting the gap. |

---

## 6. Out of Scope

- System preference detection (`prefers-color-scheme`). Binary only.
- Per-screen theme override from the middleend.
- Custom brand themes beyond light/dark.
- Animated transitions between themes (CSS `transition` on color properties — can be added later with one line in `globals.css`).
