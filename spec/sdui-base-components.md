# SDUI Base Components Reference

All 30 base components available in the frontend-web scaffold. Each is registered in `components/registry.ts` and rendered via `ComponentRenderer`.

Every component receives `{ component: SDUIComponent }` as its sole prop. The `SDUIComponent` shape is defined in `lib/types/sdui.ts`.

---

## Screen & Layout

### screen

Top-level container for a page or the app shell. When `nav_type` is present, the component arranges its children (nav slots + content_slot) into the corresponding layout. When absent, it renders as a standard page with optional header.

| Prop        | Type    | Required | Description                                                                                                                                          |
| ----------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| title       | string  | no       | Browser tab / document title metadata. Not rendered visually.                                                                                        |
| nav_type    | string  | no       | Shell layout mode: `sidebar`, `bottombar`, `header_footer`, `header_only`. Determines how nav slots and content_slot are arranged. See layout table. |
| subtitle    | string  | no       | Subtitle rendered in the header (only when `nav_type` is absent)                                                                                     |
| icon        | string  | no       | Icon/emoji rendered in the header (only when `nav_type` is absent)                                                                                   |
| back_action | boolean | no       | Show back arrow button (only when `nav_type` is absent)                                                                                              |

**Layout by `nav_type`:**

| nav_type        | Layout                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar`       | Grid `240px 1fr`. Left: nav_header + nav_main + nav_footer stacked in a sticky sidebar. Right: content_slot + other non-nav children. |
| `bottombar`     | Flex column. Optional nav_header at top, content in the middle, bottombar fixed at bottom.                                            |
| `header_footer` | Flex column. nav_header + nav_main at top with border, content middle, nav_footer at bottom.                                          |
| `header_only`   | Flex column. nav_header + nav_main at top with border, content below.                                                                 |
| (absent)        | Standard page: optional header bar (back/icon/subtitle), children stacked vertically.                                                 |

- **React**: `ScreenComponent` -- `components/base/Screen.tsx`
- **"use client"**: Yes (uses `useRouter` for back navigation)
- **Renders**: delegates to `SidebarLayout`, `BottombarLayout`, `HeaderFooterLayout`, `HeaderOnlyLayout`, or `DefaultLayout` based on `nav_type`. Each layout extracts nav slots from children by type and places them in the corresponding regions.
- **Viewport**: `screen` fills the full viewport height (`min-h-screen`). To center content in a page without `nav_type` (e.g. a login card), use a `column` child with `align_items: center` and `justify_items: center`.

#### Modal slot pattern

A **modal slot** is a project convention used by every screen with create/edit/delete flows (`assets`, `trades`, `snapshots`, `profile`). It is the stable target a screen's mutation/modal actions point at via `replace`.

**Shape.** Each screen tree has three siblings under its root, in this order:

```
screen
└── column "<screen>-root"  (gap: lg)
    ├── header              (title + global actions)
    ├── section             (filter + table/list + pagination — id "<screen>-section")
    └── modal-slot          (column id="<screen>-modal-slot", initially empty)
```

The modal slot is a `column` with a known id ending in `-modal-slot` (e.g. `snapshots-modal-slot`). It starts with no children.

**Replace targeting.** Actions that open a modal/wizard emit:

```json
{
  "action": "replace",
  "target_id": "<screen>-modal-slot",
  "tree": <subtree to inject>
}
```

The frontend swaps the slot's children for the new subtree.

**Why a sibling of section.**

- Filter/pagination of the section can `replace` `<screen>-section` without disturbing an open modal.
- Mutation success replaces the screen root (`<screen>-root`) entirely — the fresh tree carries an empty modal slot, so the modal closes and the list refreshes in one response.
- The frontend doesn't need to know what kind of subtree lands in the slot — `modal`, `wizard`, or any other component.

**Frontend rendering.** The slot is a presentational container: when it has children, the frontend renders them as an overlay layer above the section (dialog on desktop, drawer/sheet on mobile). Empty slot → no overlay. Components placed inside the slot may carry their own chrome (`modal` has its own title bar and dismiss button) or rely on the slot's overlay container (`wizard` does this).

**ModalContext on the slot's overlay.** The slot's overlay container installs a `ModalContext.Provider` (same context Modal uses, see `components/modal-context.tsx`) whose `close()` calls `clearOverride(<slot-id>)`. Any descendant component with a `dismiss`-style action — including a `button` with `{ type: "dismiss" }` or a `wizard` whose `dismiss_action` is `{ type: "dismiss" }` — closes the slot by calling `useModal()?.close()`. ESC key and backdrop click also fire close. This means the BE can emit a generic `components.Dismiss()` action for any component inside a modal slot without knowing the slot's id.

**Closing a modal.**

- A `dismiss` action on a button → frontend closes the overlay locally and clears the slot.
- A `replace` action on `<screen>-modal-slot` with an empty `tree` → equivalent server-driven close.
- A successful mutation that replaces the screen root → slot is empty in the fresh tree, overlay closes.

### row

CSS Grid row. Distributes children into columns.

| Prop          | Type     | Required | Description                                                      |
| ------------- | -------- | -------- | ---------------------------------------------------------------- |
| widths        | string[] | no       | Grid column widths (e.g. `["1fr", "2fr"]`). Defaults to `"1fr"`. |
| align_items   | string   | no       | Shared prop: cross-axis alignment                                |
| justify_items | string   | no       | Shared prop: main-axis alignment                                 |
| gap           | string   | no       | Shared prop: CSS gap value                                       |

- **React**: `RowComponent` -- `components/base/Row.tsx`
- **"use client"**: No
- **Renders**: `div` with `display: grid` and `gridTemplateColumns` from widths. Uses `containerProps`.

### column

Flex column. Stacks children vertically.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `ColumnComponent` -- `components/base/Column.tsx`
- **"use client"**: No
- **Renders**: `div.flex.flex-col`. Uses `containerProps`.

### group

Transparent grouping container. Renders as Fragment when no shared props are set; wraps in a `div` when alignment/gap props are present.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `GroupComponent` -- `components/base/Group.tsx`
- **"use client"**: No
- **Renders**: Fragment or `div`. Uses `containerProps`.

---

## Content

### text

Text block or inline span.

| Prop       | Type   | Required | Description                                                                                                         |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| content    | string | yes      | Text content                                                                                                        |
| size       | string | no       | `xs`, `sm`, `md` (default), `lg`, `xl`, `2xl`                                                                       |
| weight     | string | no       | `light`, `normal` (default), `medium`, `bold`                                                                       |
| color      | string | no       | `primary`, `secondary`, `muted`, `error`, `positive` (green, for gains/deltas), `negative` (red, for losses/deltas) |
| hex_color  | string | no       | Overrides color with hex value                                                                                      |
| display    | string | no       | `block` (default) or `inline`                                                                                       |
| decoration | string | no       | `underline`, `strikethrough`, `none`                                                                                |

- **React**: `TextComponent` -- `components/base/Text.tsx`
- **"use client"**: No
- **Renders**: `<p>` (block) or `<span>` (inline) with Tailwind text classes.

### image

Standard image element.

| Prop          | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| src           | string | yes      | Image URL                                        |
| alt           | string | yes      | Alt text                                         |
| width         | string | no       | CSS width (free-form, e.g. `"120px"`, `"50%"`)   |
| height        | string | no       | CSS height (free-form, e.g. `"120px"`, `"50%"`)  |
| fit           | string | no       | `cover`, `contain`, `fill`, `none`, `scale-down` |
| border_radius | string | no       | `none`, `sm`, `md`, `lg`, `full` (see Card)      |

- **React**: `ImageComponent` -- `components/base/Image.tsx`
- **"use client"**: No
- **Renders**: `<img>` with `max-w-full` and inline styles for dimensions.

### card

Bordered container with shadow.

| Prop          | Type   | Required | Description                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------- |
| elevation     | string | no       | `none`, `sm` (default), `md`, `lg` -- maps to Tailwind shadow |
| border_radius | string | no       | `none`, `sm` (4px), `md` (8px), `lg` (16px), `full` (9999px)  |
| align_items   | string | no       | Shared prop                                                   |
| justify_items | string | no       | Shared prop                                                   |
| gap           | string | no       | Shared prop                                                   |

- **React**: `CardComponent` -- `components/base/Card.tsx`
- **"use client"**: No
- **Renders**: `div.bg-surface-card.border.border-border.rounded-lg.p-4` with shadow class. Uses `containerProps`. The `bg-surface-card` token equals the body background in light mode and is one elevation step lighter in dark mode (gives the card a subtle "lifted" appearance against the dark background).

### list

Scrollable list container.

| Prop        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| orientation | string | no       | `vertical` (default) or `horizontal` |

- **React**: `ListComponent` -- `components/base/List.tsx`
- **"use client"**: No
- **Renders**: `div` with `overflow-y-auto` (vertical) or `flex overflow-x-auto` (horizontal).

### list_item

Individual list entry. Supports click navigation via actions.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `ListItemComponent` -- `components/base/ListItem.tsx`
- **"use client"**: Yes (uses `useRouter` for click navigation)
- **Renders**: `div.border-b.py-3.px-4`. Adds `cursor-pointer hover:bg-gray-50` when actions are present. Uses `containerProps`.

### table

Tabular data with aligned columns across header and rows. The table owns column widths and alignment; rows and cells inherit them so the header and every body row line up automatically, regardless of cell content. Use `table` for data with parallel columns (positions, orders, transactions). Use `list` for uniform feeds without column structure.

| Prop    | Type                                                                                  | Required | Description                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| columns | `{ id: string; header: string; width?: string; align?: "left"\|"center"\|"right" }[]` | yes      | Column configuration. `width` accepts grid units (`"1fr"`, `"2fr"`, `"auto"`) or fixed CSS (`"120px"`). Missing `width` defaults to `"1fr"`. `align` defaults to `"left"`. |

Children must be `table_row` components. Each row's children are placed into the columns in order; the number of children per row should match `columns.length`.

**Chevron auto-column.** When at least one child row declares `expandable: true` with non-empty `details`, the table prepends a fixed `24px` column to `gridTemplateColumns` and renders an empty header cell at index 0. The chevron column is purely presentational — it is NOT part of `columns[]` and does NOT count toward `columns.length` for cell-count validation. When no row is expandable, the table renders exactly as before (no extra column).

- **React**: `TableComponent` -- `components/base/Table.tsx`
- **"use client"**: No (wraps children in a client `TableColumnsProvider` that exposes `columns` and `hasChevronColumn`)
- **Renders**: `div[role="table"]` as a CSS Grid with `grid-template-columns` derived from `columns[].width`, optionally prefixed with `24px` when chevron column is active. Header row renders above children with a bottom border and a muted background.

### table_row

A row inside a `table`. Uses CSS subgrid so every row shares the same column tracks as the table — the header and every body row align on the same boundaries. Supports `navigate` / `navigate_back` click actions for row-level interaction (e.g. row click opens a detail screen). Optionally togglable: when `expandable: true` and `details` is non-empty, the row toggles a full-width panel rendered directly below it.

| Prop       | Type          | Required | Description                                                                                                                                                                                                                                            |
| ---------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| expandable | boolean       | no       | Default `false`. When `true` AND `details` is a non-empty array, click anywhere on the main row toggles the details panel. The frontend renders a chevron indicator in the table's auto-added chevron column.                                          |
| details    | `Component[]` | no       | Subtree rendered as a full-width panel directly below the row when expanded. Pre-emitted in the tree (no fetch on expand). Must be non-empty for the row to be expandable; an empty or absent `details` silently downgrades the row to non-expandable. |

Each child of `table_row` is rendered into a cell (`div[role="cell"]`) and aligned according to the column's `align`. Use `text`, `badge`, `image`, or any component as a cell; the scaffold does not constrain cell content.

**Toggle and state.** When expandable, click on any cell of the main row toggles the panel. The chevron rotates between `ChevronDown` (collapsed) and `ChevronUp` (expanded). State is local to the frontend, keyed implicitly by the row's React `key` (the SDUI `id`). Multiple rows in the same table can be expanded simultaneously. State is lost on any `replace` that rebuilds the row's subtree (filter change, pagination, mutation refresh) and is not persisted across page loads. No round-trip on expand — `details` is pre-emitted in the payload and mounted instantly without a network request.

**Interaction with `actions`.** When `expandable` is active (i.e. `expandable: true` and `details` non-empty), it takes precedence over `actions` — clicks toggle the panel and do not fire navigation. Backends should not combine the two on the same row.

**Panel rendering.** The details panel is emitted as a sibling grid item with `gridColumn: "1 / -1"`, breaking the subgrid and spanning all columns including the chevron column. Its content is arbitrary components (typically another `table`, a `column`, etc.).

**Interactive children take precedence.** If a cell contains a `button`, `a`, form input, or any element with `role="button"`, clicks on that element run the element's own handler and do **not** toggle the row or fire the row's `actions`. Detected via `event.target.closest('button, a, input, select, textarea, [role="button"]')`. Cells with only passive content (e.g. `text`, `badge`) continue to toggle/navigate on click as usual.

- **React**: `TableRowComponent` -- `components/base/TableRow.tsx`
- **"use client"**: Yes (uses `useRouter` for click navigation, `useTableColumns` for per-cell alignment and chevron column awareness, and `useState` for expand/collapse state)
- **Renders**: `div[role="row"]` as a subgrid that spans all columns, optionally followed by a sibling panel `div[data-table-row-details][role="presentation"]` when expanded. Cells are wrapped in `div[role="cell"]` with `px-4 py-3` padding and alignment classes. When the table has a chevron column, every row also renders a leading 24px cell (chevron icon when expandable, empty placeholder otherwise). Adds `cursor-pointer hover:bg-surface-secondary` when the row is expandable or has actions.

### badge

Overlay badge on a child component. Shows count or dot indicator.

| Prop    | Type   | Required | Description                                          |
| ------- | ------ | -------- | ---------------------------------------------------- |
| count   | number | no       | Badge count (capped at 99+). Omit for dot indicator. |
| variant | string | no       | `error` (default), `info`, `warning`, `success`      |

- **React**: `BadgeComponent` -- `components/base/Badge.tsx`
- **"use client"**: No
- **Renders**: `div.relative.inline-block` with absolute-positioned circle. Wraps first child.

### divider

Visual separator line.

| Prop        | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| orientation | string | no       | `horizontal` (default) or `vertical` |

- **React**: `DividerComponent` -- `components/base/Divider.tsx`
- **"use client"**: No
- **Renders**: `<hr>` (horizontal) or `div.border-l` (vertical).

### spacer

Empty space of a given height.

| Prop | Type   | Required | Description                                                                      |
| ---- | ------ | -------- | -------------------------------------------------------------------------------- |
| size | string | no       | Spacing token: `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (same scale as `gap`) |

- **React**: `SpacerComponent` -- `components/base/Spacer.tsx`
- **"use client"**: No
- **Renders**: empty `div` with inline `height`.

---

## Interactive

### button

Primary interactive element. Handles all action types.

| Prop      | Type    | Required | Description                                                                                                                                           |
| --------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| label     | string  | no       | Button text                                                                                                                                           |
| icon      | string  | no       | Icon token (e.g. `refresh`, `plus`, `delete`). Looked up in `lib/icon-registry.ts` and rendered as an SVG component. Takes priority over `image_src`. |
| image_src | string  | no       | Fallback image URL. Only used when `icon` is absent.                                                                                                  |
| variant   | string  | no       | `primary` (default), `secondary`                                                                                                                      |
| style     | string  | no       | `solid` (default), `ghost`, `outline`                                                                                                                 |
| size      | string  | no       | `xs`, `sm`, `md` (default), `lg`. Controls label text size and button padding.                                                                        |
| disabled  | boolean | no       | Disable button                                                                                                                                        |
| loading   | boolean | no       | Show spinner and "Loading..." text                                                                                                                    |

- **React**: `ButtonComponent` -- `components/base/Button.tsx`
- **"use client"**: Yes
- **Renders**: `<button>` with variant/style Tailwind classes. When `label` is absent (icon-only mode), the button switches to `inline-flex justify-center` with symmetric padding (`p-1` to `p-2.5` by size) so a single icon centers in a square footprint — matches the visual rhythm of `icon_toggle` when both live in the same nav row. With a `label`, layout is `flex` with asymmetric padding (`px-4 py-2` for `md`). See `sdui-actions.md` for action handling.

### icon_toggle

Binary toggle rendered as a clickable icon. Has two states (inactive / active), each with its own icon token and tooltip. On click the frontend flips the visual state instantly (optimistic) and fires the corresponding action. If the action fails, the state rolls back. Does not require a form wrapper.

The component carries **two actions** in its `actions` array — a positional convention unique to this component:

- `actions[0]` — fired when transitioning inactive → active (click while `active=false`).
- `actions[1]` — fired when transitioning active → inactive (click while `active=true`).

Both actions use `trigger: "click"`. The frontend selects based on the current visual state.

| Prop               | Type   | Required | Description                                         |
| ------------------ | ------ | -------- | --------------------------------------------------- |
| `active`           | bool   | yes      | Initial state. `false` = inactive, `true` = active. |
| `icon_inactive`    | string | yes      | Icon token shown when `active=false`.               |
| `icon_active`      | string | yes      | Icon token shown when `active=true`.                |
| `tooltip_inactive` | string | no       | Tooltip text when inactive.                         |
| `tooltip_active`   | string | no       | Tooltip text when active.                           |

- **React**: `IconToggleComponent` -- `components/base/IconToggle.tsx`
- **"use client"**: Yes (uses `useState` for optimistic flip, `useActionDispatcher` for server action, plus `useTheme` / `useSensitive` / `useSidebar` for client-only actions)
- **Renders**: `<button>` with icon from `lib/icon-registry.ts`. Both states use `text-content-primary` (white in dark, near-black in light) — visual distinction between active/inactive comes from the icon swap (`icon_active` vs `icon_inactive`), not color. Optimistic: flips immediately on click; for server-bound actions, rolls back if the dispatch throws.
- **Client-side actions supported**: `toggle_theme`, `toggle_sensitive`, `toggle_sidebar`. These run synchronously without an endpoint round-trip. Any other action type requires an `endpoint` and falls through the dispatcher.

### input

Text input field with label.

| Prop           | Type        | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name           | string      | yes      | Form field name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| input_type     | string      | no       | HTML input type (default `"text"`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| label          | string      | no       | Label text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| placeholder    | string      | no       | Placeholder text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| default_value  | string      | no       | Pre-filled value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| max_length     | number      | no       | Max character count                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| required       | boolean     | no       | Required indicator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| disabled       | boolean     | no       | Disable input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| pattern        | string      | no       | Regex (ECMAScript) for on-change and on-blur validation. When the value fails the regex (and is non-empty), the input is marked invalid (`data-sdui-invalid="true"`, red border, `aria-invalid`), and form submits through a `Button`, `Select`, `Checkbox`, or `RadioGroup` with `target_id` pointing to the enclosing form are blocked until the invalid state is cleared. Invalid regex is silently ignored. Native HTML5 validity (e.g. `required` empty, `input_type="email"` malformed, numeric range) also blocks submit and flips the invalid visual state on the next change/blur — no separate prop needed, just set `required` or the relevant `input_type`. |
| auto_uppercase | boolean     | no       | If true, the frontend transforms the typed value to uppercase on every input event. Combines with `pattern`: the transform runs before validation, so `auto_uppercase: true` + `pattern: "^[A-Z]+$"` accepts lowercase typing.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| visible_when   | VisibleWhen | no       | Conditional visibility — see [Form component visibility: `visible_when`](#form-component-visibility-visible_when).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

- **React**: `InputComponent` -- `components/base/Input.tsx`
- **"use client"**: Yes
- **Renders**: `<input>` with `data-sdui-id` attribute. Uses `defaultValue` (uncontrolled).
- **Submit serialization**: `collectFormData` (in `components/action-dispatcher.tsx`) reads `input.value` as-is for most types. Two normalizations:
  - `input_type: "datetime-local"` — the browser's native value is `"YYYY-MM-DDTHH:mm"` (local time, no timezone). Before submit, `collectFormData` parses it as local time and emits an RFC3339 UTC string via `new Date(value).toISOString()` (e.g. `"2026-04-27T22:15"` becomes `"2026-04-28T01:15:00.000Z"` in a `UTC-3` browser). Empty value stays empty. BE handlers expecting RFC3339 timestamps work directly.
  - `checkbox` and `toggle` — emitted as booleans, not strings.

### form

Form container. Groups inputs for data collection. Not an HTML `<form>` -- uses `data-sdui-id` for Button's `collectFormData`.

| Prop          | Type    | Required | Description                     |
| ------------- | ------- | -------- | ------------------------------- |
| loading       | boolean | no       | Dims and disable pointer events |
| align_items   | string  | no       | Shared prop                     |
| justify_items | string  | no       | Shared prop                     |
| gap           | string  | no       | Shared prop                     |

- **React**: `FormComponent` -- `components/base/Form.tsx`
- **"use client"**: No
- **Renders**: `div` with `data-sdui-id` and `data-sdui-form="true"`. Uses `containerProps`.

### select

Dropdown select field. Built on Radix UI's Select primitive (`radix-ui` package) for a fully styleable popover, keyboard navigation, ARIA listbox semantics, and portal positioning. The visible UI is custom — there is no native `<select>` rendered.

| Prop          | Type                                 | Required | Description                                                                                                                                                                                                                                |
| ------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name          | string                               | yes      | Form field name (used by the hidden input that participates in form collection).                                                                                                                                                           |
| label         | string                               | no       | Label text                                                                                                                                                                                                                                 |
| placeholder   | string                               | no       | Empty-state text shown when no value is selected. If absent, an option with `value: ""` (if any) is treated as the placeholder slot — its label becomes the placeholder text and it is not rendered as a selectable item.                  |
| options       | `{ value: string, label: string }[]` | no       | Select options. Items with `value: ""` are not allowed by Radix as selectable items (it reserves empty string for "no selection"); they are filtered out at render time. See `placeholder` for how `{value: "", label: "..."}` is handled. |
| default_value | string                               | no       | Pre-selected value                                                                                                                                                                                                                         |
| required      | boolean                              | no       | Required indicator                                                                                                                                                                                                                         |
| disabled      | boolean                              | no       | Disable select                                                                                                                                                                                                                             |
| visible_when  | VisibleWhen                          | no       | Conditional visibility — see [Form component visibility: `visible_when`](#form-component-visibility-visible_when).                                                                                                                         |

- **React**: `SelectComponent` -- `components/base/Select.tsx`
- **"use client"**: Yes (controlled via `useState`, dispatches `change` action on value change)
- **Renders**: A wrapper `div[data-sdui-id]` containing a hidden `<input name=... value=...>` (so `collectFormData` picks the value up like any other form field) plus Radix's `Select.Root` → `Trigger` (with `bg-transparent`, `border-border-input`, chevron-down icon) → `Portal` → `Content` (`bg-surface-card`, bordered, shadowed popover) → `Viewport` of `Item`s. Each item shows a `Check` icon on the right when selected. Scroll up/down buttons appear when the list overflows.
- **Placeholder source:** when a `change` action is dispatched, `select` exposes `value` — the `value` of the currently selected option — for URL placeholder substitution (see [sdui-actions.md § URL Placeholders](sdui-actions.md)).
- **Action dispatch:** `select` switches on the `change` action's `type`:
  - `type: "reload"` → dispatches as `GET` (per the `reload` contract; `method` is ignored), no request body. The selected value reaches the middleend via `{value}` substitution in the `endpoint`.
  - `type: "submit"` → dispatches with `method` (default `POST`). Request body is `{ ...collectFormData(target_id), [name]: value }` — the form's collected fields with the new selection merged in (the merge is required because React state hasn't yet flushed to the hidden `<input>`).
  - Other action types are not handled on `change`.
- **Clear button:** when a value is selected and the field is not disabled, a small "X" icon button appears as a sibling **to the right of the trigger** (outside the trigger box, not overlaid on it — same layout as v1's `asset-filter` filter UX). Clicking it sets the value to `""` and fires the `change` action with `value=""` — the middleend decides what an empty value means (typically: clear the filter, no selection). The button is a real `<button>` separate from the trigger, so opening the dropdown and clearing are independent gestures. `required` is not enforced at this layer; if the field is required, the form's submit-time validation handles it.

### checkbox

Checkbox with label.

| Prop         | Type        | Required | Description                                                                                                        |
| ------------ | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| name         | string      | yes      | Form field name                                                                                                    |
| label        | string      | yes      | Label text                                                                                                         |
| checked      | boolean     | no       | Default checked state                                                                                              |
| disabled     | boolean     | no       | Disable checkbox                                                                                                   |
| visible_when | VisibleWhen | no       | Conditional visibility — see [Form component visibility: `visible_when`](#form-component-visibility-visible_when). |

- **React**: `CheckboxComponent` -- `components/base/Checkbox.tsx`
- **"use client"**: Yes
- **Renders**: `<label>` wrapping `<input type="checkbox">` with `data-sdui-id`.

### toggle

Toggle switch with hidden input for form submission.

| Prop     | Type    | Required | Description          |
| -------- | ------- | -------- | -------------------- |
| name     | string  | yes      | Form field name      |
| label    | string  | yes      | Label text           |
| checked  | boolean | no       | Default on/off state |
| disabled | boolean | no       | Disable toggle       |

- **React**: `ToggleComponent` -- `components/base/Toggle.tsx`
- **"use client"**: Yes (uses `useState` for toggle state)
- **Renders**: Custom switch with `<input type="hidden">` carrying the value. Blue track when on.

### textarea

Multi-line text input.

| Prop          | Type        | Required | Description                                                                                                        |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| name          | string      | yes      | Form field name                                                                                                    |
| label         | string      | no       | Label text                                                                                                         |
| placeholder   | string      | no       | Placeholder text                                                                                                   |
| default_value | string      | no       | Pre-filled value                                                                                                   |
| rows          | number      | no       | Visible rows (default 3)                                                                                           |
| max_length    | number      | no       | Max character count                                                                                                |
| required      | boolean     | no       | Required indicator                                                                                                 |
| disabled      | boolean     | no       | Disable textarea                                                                                                   |
| visible_when  | VisibleWhen | no       | Conditional visibility — see [Form component visibility: `visible_when`](#form-component-visibility-visible_when). |

- **React**: `TextareaComponent` -- `components/base/Textarea.tsx`
- **"use client"**: Yes
- **Renders**: `<textarea>` with `data-sdui-id`.

### radio_group

Radio button group.

| Prop          | Type                                 | Required | Description                                                                                                        |
| ------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| name          | string                               | yes      | Form field name (shared across all radios)                                                                         |
| label         | string                               | no       | Group legend                                                                                                       |
| options       | `{ value: string, label: string }[]` | no       | Radio options                                                                                                      |
| default_value | string                               | no       | Pre-selected value                                                                                                 |
| required      | boolean                              | no       | Required indicator                                                                                                 |
| disabled      | boolean                              | no       | Disable all options                                                                                                |
| visible_when  | VisibleWhen                          | no       | Conditional visibility — see [Form component visibility: `visible_when`](#form-component-visibility-visible_when). |

- **React**: `RadioGroupComponent` -- `components/base/RadioGroup.tsx`
- **"use client"**: Yes
- **Renders**: `<fieldset>` with `data-sdui-id` containing radio `<input>` elements.

---

## State & Feedback

### loading

Loading indicator.

| Prop    | Type   | Required | Description                       |
| ------- | ------ | -------- | --------------------------------- |
| size    | string | no       | `sm`, `md` (default), `lg`        |
| variant | string | no       | `spinner` (default) or `skeleton` |

- **React**: `LoadingComponent` -- `components/base/Loading.tsx`
- **"use client"**: No
- **Renders**: Pulsing text "Loading..." (spinner) or gray animated bar (skeleton).

### error

Error message with optional retry.

| Prop         | Type    | Required | Description       |
| ------------ | ------- | -------- | ----------------- |
| message      | string  | yes      | Error text        |
| retry_action | boolean | no       | Show retry button |

- **React**: `ErrorComponent` -- `components/base/Error.tsx`
- **"use client"**: Yes (uses `useRouter` for retry)
- **Renders**: Red bordered box with message. Retry button triggers first action (reload or refresh).

### snackbar

Auto-dismissing toast notification. Disappears after 4 seconds.

| Prop    | Type   | Required | Description                                     |
| ------- | ------ | -------- | ----------------------------------------------- |
| message | string | yes      | Toast text                                      |
| variant | string | no       | `info` (default), `success`, `error`, `warning` |

- **React**: `SnackbarComponent` -- `components/base/Snackbar.tsx`
- **"use client"**: Yes (uses `useState`, `useEffect` for auto-dismiss)
- **Renders**: Fixed-position bottom-right toast with colored background.

### modal

Overlay dialog with backdrop.

| Prop         | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| visible      | boolean | yes      | Controls visibility                              |
| title        | string  | no       | Dialog title (renders header with border)        |
| dismissible  | boolean | no       | Allow backdrop dismiss (default true)            |
| presentation | string  | no       | `dialog` (default), `bottom_sheet`, `fullscreen` |

- **React**: `ModalComponent` -- `components/base/Modal.tsx`
- **"use client"**: Yes (uses `useEffect` to lock body scroll; owns an internal `dismissed` boolean that closes the modal client-side)
- **Renders**: Fixed overlay (`z-50`) with `bg-overlay/70` backdrop. Content panel uses `bg-surface-card` with `border` and `shadow-2xl` so it floats clearly over the darkened page. Panel shape varies by `presentation`.
- **Closing:** The panel provides a `ModalContext` via `components/modal-context.tsx` exposing `{ close: () => void }`. Any descendant `button` with `{ type: "dismiss" }` closes the modal by calling `close()` — purely client-side, no round-trip. Backdrop click and the `Escape` key also call `close()` when `dismissible !== false`. On `submit`, the frontend does **not** auto-close; the middleend controls post-submit UI via its `replace` response. To close the modal after a successful submit, the middleend sends a `replace` whose tree no longer contains the modal (either by replacing the modal's slot with an empty tree, or by replacing an ancestor whose new subtree omits the modal). When `setOverride` installs a new tree, any stale overrides for ids contained inside that tree are cleared — this is what disconnects a previously-open modal when the middleend's replace lands on an ancestor. To keep the modal open with a different UI (e.g. field errors), the middleend sends `replace` targeting the modal's containing slot with a new tree that still renders a modal.

---

## Shell Slots

These components form the application shell. See `sdui-shell.md` for integration details.

### nav_header

Top section of the sidebar navigation. Typically holds logo/brand.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `NavHeaderComponent` -- `components/base/NavHeader.tsx`
- **"use client"**: No
- **Renders**: `div.flex.items-center.gap-3.p-4.border-b`. Uses `containerProps`.

### nav_main

Scrollable main navigation area. Contains `nav_item` children.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `NavMainComponent` -- `components/base/NavMain.tsx`
- **"use client"**: No
- **Renders**: `<nav>.flex-1.overflow-y-auto.p-2`. Uses `containerProps`.

### nav_footer

Bottom section of the sidebar navigation. Typically holds user info or settings.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `NavFooterComponent` -- `components/base/NavFooter.tsx`
- **"use client"**: No
- **Renders**: `div.p-4.border-t`. Uses `containerProps`.

### nav_item

Individual navigation link inside `nav_main`.

| Prop        | Type   | Required | Description             |
| ----------- | ------ | -------- | ----------------------- |
| label       | string | yes      | Item text               |
| icon        | string | no       | Icon/emoji              |
| badge_count | number | no       | Badge indicator on icon |

- **React**: `NavItemComponent` -- `components/base/NavItem.tsx`
- **"use client"**: Yes (uses `useRouter` for navigation)
- **Renders**: `<button>` full-width with icon, label, and optional badge. Navigates on click via first action.

### bottombar

Fixed bottom navigation bar.

| Prop          | Type   | Required | Description |
| ------------- | ------ | -------- | ----------- |
| align_items   | string | no       | Shared prop |
| justify_items | string | no       | Shared prop |
| gap           | string | no       | Shared prop |

- **React**: `BottomBarComponent` -- `components/base/BottomBar.tsx`
- **"use client"**: No
- **Renders**: `div.fixed.bottom-0.left-0.right-0.flex.justify-around.items-center.border-t.bg-white.p-2`. Uses `containerProps`.

### content_slot

Placeholder where screen content is injected by the shell. See `sdui-shell.md`.

| Prop   | Type | Required | Description                                     |
| ------ | ---- | -------- | ----------------------------------------------- |
| (none) | --   | --       | No props. Receives children via `injectScreen`. |

- **React**: `ContentSlotComponent` -- `components/base/ContentSlot.tsx`
- **"use client"**: No
- **Renders**: `div.flex-1` containing injected children.

---

## Form component visibility: `visible_when`

Any of the five form components (`input`, `select`, `checkbox`, `textarea`, `radio_group`) may include a `visible_when` prop to make its rendering conditional on the current value of another field in the same `form`.

```ts
type VisibleWhen = {
  field: string; // name of another form control in the same form
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
