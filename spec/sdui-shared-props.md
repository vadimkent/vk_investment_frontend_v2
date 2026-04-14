# SDUI Shared Props

Shared props are cross-cutting layout properties that multiple components support. They are resolved to Tailwind CSS classes and inline styles by utility functions in `lib/sdui-utils.ts`.

There are two categories: **container props** (applied to components that render children) and **self props** (applied to any component to control its own positioning within a parent).

---

## 1. Utility Functions

### `containerProps(component: SDUIComponent)`

Extracts alignment and gap props, returns `{ className: string, style: Record<string, string> }`.

Used by: `Row`, `Column`, `Group`, `Card`, `Form`, `ListItem`, `NavHeader`, `NavMain`, `NavFooter`, `BottomBar`.

```typescript
const shared = containerProps(component);
// shared.className → "items-center justify-start"
// shared.style     → { gap: "8px" }
```

Components merge `shared.className` into their own class string and spread `shared.style` into inline styles.

### `selfProps(component: SDUIComponent)`

Extracts self-alignment and position props, returns a single class string.

Applied automatically by `ComponentRenderer` in `components/renderer.tsx`:

```typescript
const selfClasses = selfProps(component);
if (selfClasses) {
  return (
    <div className={selfClasses}>
      <Component component={component} />
    </div>
  );
}
return <Component component={component} />;
```

When `selfProps` returns a non-empty string, the renderer wraps the component in a `div` with those classes. This means **every component** automatically supports self-alignment and positioning without any code in the component itself.

The `TextComponent` is an exception -- it calls `selfProps` directly and applies the classes to its own element, avoiding an extra wrapper div.

---

## 2. Container Props

| Prop            | Type   | Description                       |
| --------------- | ------ | --------------------------------- |
| `align_items`   | string | Cross-axis alignment of children  |
| `justify_items` | string | Main-axis alignment of children   |
| `gap`           | string | Spacing token (see mapping below) |

### `align_items` Mapping

| Value     | Tailwind Class  |
| --------- | --------------- |
| `left`    | `items-start`   |
| `center`  | `items-center`  |
| `right`   | `items-end`     |
| `stretch` | `items-stretch` |

### `justify_items` Mapping

| Value     | Tailwind Class    |
| --------- | ----------------- |
| `top`     | `justify-start`   |
| `center`  | `justify-center`  |
| `bottom`  | `justify-end`     |
| `stretch` | `justify-stretch` |

### `gap` Mapping

Token-based. Unknown or raw CSS values (e.g. `"12px"`) are ignored silently.

| Value  | CSS Value |
| ------ | --------- |
| `none` | `0`       |
| `xs`   | `4px`     |
| `sm`   | `8px`     |
| `md`   | `16px`    |
| `lg`   | `24px`    |
| `xl`   | `32px`    |
| `2xl`  | `48px`    |

---

## 3. Self Props

| Prop           | Type   | Description                             |
| -------------- | ------ | --------------------------------------- |
| `align_self`   | string | Cross-axis self-alignment within parent |
| `justify_self` | string | Main-axis self-alignment within parent  |
| `position`     | string | CSS positioning mode                    |

### `align_self` Mapping

| Value    | Tailwind Class |
| -------- | -------------- |
| `left`   | `self-start`   |
| `center` | `self-center`  |
| `right`  | `self-end`     |

### `justify_self` Mapping

| Value    | Tailwind Class        |
| -------- | --------------------- |
| `top`    | `justify-self-start`  |
| `center` | `justify-self-center` |
| `bottom` | `justify-self-end`    |

### `position` Mapping

| Value      | Tailwind Class |
| ---------- | -------------- |
| `fixed`    | `fixed`        |
| `absolute` | `absolute`     |

---

## 4. How to Extend Shared Props

### Adding a new container prop

1. Add the mapping in `sdui-utils.ts` (e.g., a new `flexWrapMap`).
2. Read the prop from `component.props` inside `containerProps`.
3. Push the resolved class to `classes` or add a style entry to `style`.
4. No changes needed in individual components -- they already spread `containerProps` output.

### Adding a new self prop

1. Add the mapping in `sdui-utils.ts`.
2. Read the prop inside `selfProps`.
3. Push the resolved class to `classes`.
4. No changes needed -- `ComponentRenderer` automatically applies the wrapper div.

### Adding a prop as inline style vs. Tailwind class

- Use **Tailwind class** when the value maps to a fixed set of options (e.g., alignment values).
- Use **inline style** when the value is freeform (e.g., gap, padding amounts). This avoids Tailwind's JIT limitations with dynamic values.
