# SDUI Base Components Reference

All 30 base components available in the frontend-web scaffold. Each is registered in `components/registry.ts` and rendered via `ComponentRenderer`.

Every component receives `{ component: SDUIComponent }` as its sole prop. The `SDUIComponent` shape is defined in `lib/types/sdui.ts`.

---

## Screen & Layout

### screen

Top-level container for a page. Renders title bar with optional back button, subtitle, and icon. Children render below the header.

| Prop        | Type    | Required | Description                                                   |
| ----------- | ------- | -------- | ------------------------------------------------------------- |
| title       | string  | no       | Browser tab / document title metadata. Not rendered visually. |
| subtitle    | string  | no       | Subtitle rendered in the header                               |
| icon        | string  | no       | Icon/emoji rendered in the header                             |
| back_action | boolean | no       | Show back arrow button                                        |

- **React**: `ScreenComponent` -- `components/base/Screen.tsx`
- **"use client"**: Yes (uses `useRouter` for back navigation)
- **Renders**: `div.min-h-screen` > header bar + children. Back button triggers first action (navigate_back or navigate).
- **Viewport**: `screen` fills the full viewport height (`min-h-screen`). To center content (e.g. a login card), use a `column` child with `align_items: center` and `justify_items: center`.

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
- **Renders**: `div.border.rounded-lg.p-4` with shadow class. Uses `containerProps`.

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

- **React**: `TableComponent` -- `components/base/Table.tsx`
- **"use client"**: No (wraps children in a client `TableColumnsProvider`)
- **Renders**: `div[role="table"]` as a CSS Grid with `grid-template-columns` derived from `columns[].width`. Header row renders above children with a bottom border and a muted background.

### table_row

A row inside a `table`. Uses CSS subgrid so every row shares the same column tracks as the table — the header and every body row align on the same boundaries. Supports `navigate` / `navigate_back` click actions for row-level interaction (e.g. row click opens a detail screen).

| Prop   | Type | Required | Description                |
| ------ | ---- | -------- | -------------------------- |
| (none) | --   | --       | Shape comes from the table |

Each child of `table_row` is rendered into a cell (`div[role="cell"]`) and aligned according to the column's `align`. Use `text`, `badge`, `image`, or any component as a cell; the scaffold does not constrain cell content.

- **React**: `TableRowComponent` -- `components/base/TableRow.tsx`
- **"use client"**: Yes (uses `useRouter` for click navigation and `useTableColumns` for per-cell alignment)
- **Renders**: `div[role="row"]` as a subgrid that spans all columns. Each cell is wrapped in `div[role="cell"]` with `px-4 py-3` padding and alignment classes. Adds `cursor-pointer hover:bg-gray-50` when actions are present.

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

| Prop      | Type    | Required | Description                                                                    |
| --------- | ------- | -------- | ------------------------------------------------------------------------------ |
| label     | string  | no       | Button text                                                                    |
| image_src | string  | no       | Icon image URL                                                                 |
| variant   | string  | no       | `primary` (default), `secondary`                                               |
| style     | string  | no       | `solid` (default), `ghost`, `outline`                                          |
| size      | string  | no       | `xs`, `sm`, `md` (default), `lg`. Controls label text size and button padding. |
| disabled  | boolean | no       | Disable button                                                                 |
| loading   | boolean | no       | Show spinner and "Loading..." text                                             |

- **React**: `ButtonComponent` -- `components/base/Button.tsx`
- **"use client"**: Yes
- **Renders**: `<button>` with variant/style Tailwind classes. See `sdui-actions.md` for action handling.

### input

Text input field with label.

| Prop          | Type    | Required | Description                        |
| ------------- | ------- | -------- | ---------------------------------- |
| name          | string  | yes      | Form field name                    |
| input_type    | string  | no       | HTML input type (default `"text"`) |
| label         | string  | no       | Label text                         |
| placeholder   | string  | no       | Placeholder text                   |
| default_value | string  | no       | Pre-filled value                   |
| max_length    | number  | no       | Max character count                |
| required      | boolean | no       | Required indicator                 |
| disabled      | boolean | no       | Disable input                      |

- **React**: `InputComponent` -- `components/base/Input.tsx`
- **"use client"**: Yes
- **Renders**: `<input>` with `data-sdui-id` attribute. Uses `defaultValue` (uncontrolled).

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

Dropdown select field.

| Prop          | Type                                 | Required | Description        |
| ------------- | ------------------------------------ | -------- | ------------------ |
| name          | string                               | yes      | Form field name    |
| label         | string                               | no       | Label text         |
| placeholder   | string                               | no       | Empty option text  |
| options       | `{ value: string, label: string }[]` | no       | Select options     |
| default_value | string                               | no       | Pre-selected value |
| required      | boolean                              | no       | Required indicator |
| disabled      | boolean                              | no       | Disable select     |

- **React**: `SelectComponent` -- `components/base/Select.tsx`
- **"use client"**: Yes
- **Renders**: `<select>` with `data-sdui-id`.

### checkbox

Checkbox with label.

| Prop     | Type    | Required | Description           |
| -------- | ------- | -------- | --------------------- |
| name     | string  | yes      | Form field name       |
| label    | string  | yes      | Label text            |
| checked  | boolean | no       | Default checked state |
| disabled | boolean | no       | Disable checkbox      |

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

| Prop          | Type    | Required | Description              |
| ------------- | ------- | -------- | ------------------------ |
| name          | string  | yes      | Form field name          |
| label         | string  | no       | Label text               |
| placeholder   | string  | no       | Placeholder text         |
| default_value | string  | no       | Pre-filled value         |
| rows          | number  | no       | Visible rows (default 3) |
| max_length    | number  | no       | Max character count      |
| required      | boolean | no       | Required indicator       |
| disabled      | boolean | no       | Disable textarea         |

- **React**: `TextareaComponent` -- `components/base/Textarea.tsx`
- **"use client"**: Yes
- **Renders**: `<textarea>` with `data-sdui-id`.

### radio_group

Radio button group.

| Prop          | Type                                 | Required | Description                                |
| ------------- | ------------------------------------ | -------- | ------------------------------------------ |
| name          | string                               | yes      | Form field name (shared across all radios) |
| label         | string                               | no       | Group legend                               |
| options       | `{ value: string, label: string }[]` | no       | Radio options                              |
| default_value | string                               | no       | Pre-selected value                         |
| required      | boolean                              | no       | Required indicator                         |
| disabled      | boolean                              | no       | Disable all options                        |

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
- **"use client"**: Yes (uses `useEffect` to lock body scroll)
- **Renders**: Fixed overlay (`z-50`) with semi-transparent backdrop. Content panel varies by presentation mode.

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
