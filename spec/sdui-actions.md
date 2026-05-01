# SDUI Actions

Actions define user interactions on components. The primary action handler is `ButtonComponent` (`components/base/Button.tsx`), though `ListItemComponent`, `NavItemComponent`, `ScreenComponent`, and `ErrorComponent` also handle specific action types.

---

## 1. Action Model

Defined in `lib/types/sdui.ts`:

```typescript
interface SDUIAction {
  trigger: string; // "click", "submit", etc.
  type: string; // Action type (see table below)
  url?: string; // Target URL for navigation
  target?: string; // "blank" for new tab
  endpoint?: string; // Middleend endpoint for server actions
  method?: string; // HTTP method (default "POST")
  target_id?: string; // Form container ID for data collection
  loading?:
    | "section"
    | "full"
    | { scope: "section" | "full"; messages?: string[] }; // Loading indicator (see §2b)
}
```

Actions are in the `actions` array on any `SDUIComponent`. Button uses the first action (`actions[0]`).

---

## 2. Action Types

Action types handled by `ButtonComponent` (all of the below). `IconToggleComponent` handles a subset — the client-only toggles (`toggle_theme`, `toggle_sensitive`, `toggle_sidebar`) plus any action with an `endpoint` for server round-trips.

| Type               | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Required Fields                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `navigate`         | Client-side navigation via `router.push(url)`. Opens new tab if `target === "blank"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `url`                                        |
| `navigate_back`    | Browser back via `router.back()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | (none)                                       |
| `submit`           | Collects form data from `target_id` container, sends to middleend via `/api/action` proxy, processes response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `endpoint`, optionally `target_id`, `method` |
| `reload`           | Sends GET to middleend endpoint via `/api/action`, processes response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `endpoint`                                   |
| `refresh`          | Triggers `router.refresh()` to re-render server components.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | (none)                                       |
| `open_url`         | Opens URL in a new tab via `window.open`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `url`                                        |
| `download`         | Triggers a native browser download from a middleend endpoint. Creates a transient hidden `<a href={proxyUrl} download>`, clicks it, removes it. The frontend proxies through `/api/action-download?url={url}` so the HttpOnly auth cookie is forwarded; `Content-Disposition` is propagated to the browser. No `ActionResponse` is parsed; no SDUI subtree replaced; no loading indicator. The endpoint must respond with `Content-Disposition: attachment; filename="..."` plus the body bytes. **Auth:** if unauthorized, the endpoint must respond with `302 Location: /login` (not the JSON `{error,redirect}` shape used by `submit`/`reload`). 5xx surfaces as the browser's default failed-download UI — no inline error rendering. Use only for endpoints returning binary/CSV/file bytes meant to be saved. Do **not** use `open_url` (that's for external URLs) or `submit`/`reload` (those parse JSON). | `url`                                        |
| `dismiss`          | Closes the enclosing `modal` client-side via `useModal().close()`. No-op when the button is not inside a modal. No round-trip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | (none)                                       |
| `replace`          | Client-side override mutation. With `tree` set, calls `setOverride(target_id, tree)`; with `tree: null` or absent, calls `clearOverride(target_id)`. No round-trip. Used for things like dismissing a wizard by clearing the modal slot that contains it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `target_id`, optionally `tree`               |
| `logout`           | POSTs to `/api/auth/logout`, then navigates to `/login`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | (none)                                       |
| `toggle_theme`     | Toggles light/dark mode. Client-side only, no round-trip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | (none)                                       |
| `toggle_sensitive` | Toggles the global sensitive-data mask (hides amounts/values). Client-side only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | (none)                                       |
| `toggle_sidebar`   | Toggles the sidebar's collapsed/expanded state (persisted in the `sidebar-collapsed` cookie, server-readable). Client-side only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | (none)                                       |

Custom action types (project-specific, not part of the base set) are documented in `sdui-custom-components.md §7`.

### Client-emitted `replace` vs. server-returned `replace`

Both share the override map, but they enter from different sides:

- **Server-returned** (§5): the BE responds to a `submit`/`reload`/etc. with `{ action: "replace", target_id, tree }`, processed by `useActionDispatcher`.
- **Client-emitted** (this section): an action declared with `type: "replace"` runs entirely client-side — no `/api/action` call. The component dispatching the action reads `target_id` and `tree` directly from the action shape and calls `setOverride` (with tree) or `clearOverride` (without). First user: `wizard.dismiss_action`.

---

## 2a. URL Placeholders

Any action with a `url` or `endpoint` field may contain placeholders of the form `{name}`. When the action is dispatched, the frontend substitutes each placeholder with a named value provided by the component (or form) that triggered the action.

The set of names a component exposes is defined in each component's spec (see [sdui-base-components.md](sdui-base-components.md)). For example, `select` exposes `value` (the `value` of the currently selected option), so `endpoint: "/api/list?asset_type={value}"` on a select becomes `/api/list?asset_type=STOCK` when the option with `value:"STOCK"` is chosen.

The substituted value is URL-encoded by the frontend before being spliced into the string. Placeholders whose name is not exposed by the triggering component are a middleend authoring error — the spec does not define a behavior for them; the current frontend implementation leaves them in place (`/foo/{unknown}` stays literal), so a misconfigured action will produce a visibly wrong URL rather than crashing.

**Implementation:** the helper `lib/url-placeholders.ts#substitutePlaceholders(template, values)` is invoked at every call site that touches `action.url` or `action.endpoint` (Button, NavItem, ListItem, TableRow, Screen, Error, IconToggle, Select). Components that do not expose any values pass `{}` so the helper acts as a pass-through; only `select` provides actual values today.

---

## 2b. Loading Indicators

Any action that hits the middleend (`submit`, `reload`) can declare a `loading` field to show a visual indicator while the request is in flight. Two equivalent forms are accepted.

**Form A — string token (default for short waits):**

| Value       | Behavior                                                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"section"` | Renders a translucent overlay with a spinner over the existing subtree whose `id` matches `target_id`. The previous content stays mounted (faded + non-interactive) so the user keeps visual context. When the response arrives and a `replace` swaps the subtree, React mounts the new tree fresh — the old tree is replaced via the override map, not by the loading state. |
| `"full"`    | Renders a fullscreen overlay (`z-50`) with spinner over the entire viewport.                                                                                                                                                                                                                                                                                                  |
| (absent)    | No loading indicator. The action completes silently (current default behavior).                                                                                                                                                                                                                                                                                               |

**Form B — object with cycling messages (for long waits):**

```json
"loading": {
  "scope": "section" | "full",
  "messages": ["Detecting columns…", "Mapping tickers…", "Resolving currencies…"]
}
```

| Field      | Type     | Required | Description                                                                                                                                                                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`    | enum     | yes      | `"section"` or `"full"` — same semantics as Form A.                                                                                                                                                                       |
| `messages` | string[] | no       | Localized phrases the frontend rotates through every **4 seconds** in order, looping at the end. Empty / absent → behaves like Form A. The frontend renders one line beneath the spinner with a soft cross-fade (~700ms). |

Messages are purely cosmetic — they have no relationship to actual server-side progress.

The middleend decides **when** to show loading and **what scope** — the frontend only implements the visual. Loading clears automatically when the action response arrives (in a `finally` block, so errors don't leave stale overlays).

Example — reload with section loading:

```json
{
  "trigger": "click",
  "type": "reload",
  "endpoint": "/actions/portfolio/live_data?live=true",
  "target_id": "live-data-section",
  "loading": "section"
}
```

While the request is in flight, the OverrideBoundary for `id="live-data-section"` unmounts its children and renders only a centered spinner. When the response arrives (typically `action: "replace"` with a new tree), the spinner clears and the new tree mounts fresh — components in the subtree never carry client state across the replace.

Client-side-only actions (`toggle_theme`, `toggle_sensitive`, `navigate`, `refresh`, etc.) ignore `loading` — they are synchronous or handled by the router.

---

## 3. Form Data Collection

Before collecting data, the dispatcher calls `hasInvalidFields(target_id)` (same module). It returns `true` if any descendant of the target container has `data-sdui-invalid="true"` (set by components like `input` with a failing `pattern`, or `select`'s hidden input when `required` and empty), OR if any non-hidden `input[name]` / `textarea[name]` / `select[name]` descendant fails HTML5 native validity (`required` empty, `input_type="email"` malformed, range mismatch, etc.). A truthy result aborts the dispatch and focuses the first offending field. The user retries after fixing.

When a `submit` action has a `target_id`, `collectFormData` (in `components/action-dispatcher.tsx`) queries the DOM:

```typescript
const container = document.querySelector(`[data-sdui-id="${targetId}"]`);
```

Values are collected with their **native types**, not stringified:

- `input[type="checkbox"]` → `boolean` (`.checked`).
- `input[data-sdui-kind="toggle"]` → `boolean` (parsed from `.value`).
- `input[name]` (text/email/password/etc.), `select[name]`, `textarea[name]` → `string` (`.value`).

Direct-path submissions from inputs that have a `trigger: "change"` action and **no** `target_id` send `{ [name]: value }` with the native type (`boolean` for Checkbox/Toggle, `string` for Input/Select/RadioGroup). This matches what the middleend's typed struct schemas expect (Go/Java/Swift bindings all expect native JSON types, not strings).

The `Form` component renders with `data-sdui-id={component.id}`, making it the target. All form input components (`Input`, `Select`, `Checkbox`, `Toggle`, `Textarea`, `RadioGroup`) render with `name` attributes.

> **Contract note.** The middleend should declare action payload types as native JSON (`"include_closed": false`, not `"include_closed": "false"`). If a field needs string semantics (e.g., a currency code), the underlying input is already a `string`.

---

## 3a. Submitting on Enter

`Form` is a `<div data-sdui-form="true">`, not an HTML `<form>` — so the browser does not natively translate Enter-key presses on inputs into a form submit. The frontend reproduces the standard "press Enter to submit" behavior in user-space:

- Every `<button>` whose action has `type: "submit"` is rendered with `data-sdui-submit="true"`.
- `Input` listens for `keydown`. When the key is `Enter` (no IME composition in progress), the input walks up to the nearest `[data-sdui-form="true"]` ancestor, finds the first descendant `[data-sdui-submit="true"]:not([disabled])`, and calls `.click()`.
- The clicked button runs its existing `submit` flow — `hasInvalidFields` check, `revealErrors` if blocked, `collectFormData`, dispatch. Nothing in the submit path is duplicated.
- `Textarea` does **not** trap Enter; the browser default (insert newline) is preserved.
- If the form has no `data-sdui-submit="true"` button (e.g. forms that auto-submit via `change` actions), Enter does nothing.
- If the form has multiple submit buttons (uncommon — typically only one alongside `cancel`/`navigate` siblings), the first in DOM order wins.

**Middleend takeaway:** no contract change required. To opt into Enter-to-submit, simply emit a `button` with a `submit` action inside the form — the same shape used today. To opt out, omit the submit button (rare).

---

## 4. The `/api/action` Proxy

Defined in `app/api/action/route.ts.tmpl`. All server-bound actions go through this Next.js Route Handler.

### Request Flow

```
Browser (ButtonComponent)
  → POST /api/action
    { endpoint: "/actions/login", method: "POST", data: { email: "...", password: "..." } }
  → Next.js Route Handler
    → POST http://middleend:8081/actions/login
      Headers: Content-Type, X-Platform, Authorization (from cookie)
      Body: { email: "...", password: "..." }
    ← Response from middleend
  ← JSON response to browser
```

### Why a Proxy

- The browser never knows `MIDDLEEND_URL` (server-side env var only).
- Auth tokens are stored in HttpOnly cookies -- inaccessible to JavaScript.
- The proxy reads the cookie and forwards it as an `Authorization` header.

---

## 5. Action Response

The middleend returns an `SDUIActionResponse`:

```typescript
interface SDUIActionResponse {
  action: "replace" | "navigate" | "refresh" | "none" | "logout";
  target_id?: string;
  tree?: SDUIComponent;
  feedback?: SDUIComponent;
  auth?: { token: string; expires_at?: string };
}
```

All action responses are processed by the central `useActionDispatcher` hook in `components/action-dispatcher.tsx`, which every interactive component (Button, Checkbox, Toggle, Select, RadioGroup) uses:

| Response Action | Frontend Behavior                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navigate`      | `router.push(target_id)` -- client-side navigation to the given path.                                                                                                                                                                                                                       |
| `refresh`       | `router.refresh()` -- re-runs server components to fetch fresh data.                                                                                                                                                                                                                        |
| `replace`       | Sets `overrideMap[target_id] = tree` via `OverrideMapProvider`. `ComponentRenderer` checks the override for every id it renders and, if present, renders the override instead.                                                                                                              |
| `none`          | No navigation. Used when the action has side effects only (e.g., sending email).                                                                                                                                                                                                            |
| `logout`        | `POST /api/auth/logout` to clear the HttpOnly auth cookie, then `window.location.href = target_id` (full reload, not `router.push`, so all in-memory state and overrides are dropped). Used by destructive flows (e.g. delete account) where the session must end alongside the navigation. |

### `feedback`

When present, the dispatcher renders the `feedback` component as a transient UI affordance, regardless of the `action` value (any `action`, including `none`, may carry feedback). Today the only supported shape is `{ type: "snackbar", props: { message, variant } }` — `useActionDispatcher` reads `props.message` and `props.variant` and calls the `Snackbar` provider's `show(message, variant)`. Variant is whitelisted to `success | error | warning | info` (anything else falls back to `info`).

### `auth`

Any response may carry `auth`. The `/api/action` proxy intercepts it server-side, sets the `token` as an HttpOnly cookie, and strips the field from the response forwarded to the browser. The browser never sees the token. See §6 (Auth Flow) for the login/logout lifecycle.

### Partial Replacement (`replace`)

`replace` lets the middleend swap a subtree without a full `router.refresh()`. It is the primary pattern for optimistic toggle / inline update interactions.

Lifecycle:

1. User interacts (e.g., toggles a checkbox).
2. The input component's `trigger: "change"` action posts to `/api/action`.
3. The middleend returns `{ action: "replace", target_id: "card-settings", tree: {...} }`.
4. The dispatcher calls `setOverride("card-settings", tree)`.
5. `<OverrideBoundary>` around the id swaps the rendered subtree on the next render.
6. Overrides clear automatically when `usePathname()` changes (navigation flushes stale state).

The override layer is a pure client-side concern. The middleend does not see overrides; on the next full SSR of the same screen the server tree is authoritative again.

### Trigger: `change` on input components

`Checkbox`, `Toggle`, `Select`, and `RadioGroup` each support a single action with `trigger: "change"`. When present, the action fires on every value change. If `target_id` is provided on the action, `collectFormData(target_id)` gathers the whole form; otherwise only `{ [name]: <new value> }` is sent. The `type` is typically `submit`, and the response is handled by the same dispatcher as button submits.

---

## 6. Auth Flow

### Login

1. User fills form inputs inside a `form` component.
2. Button with `submit` action sends data to `/api/action`.
3. The Route Handler forwards to the middleend (e.g., `POST /actions/login`).
4. Middleend responds with `{ auth: { token: "jwt..." }, action: "navigate", target_id: "/" }`.
5. The Route Handler extracts `auth.token`, sets it as an HttpOnly cookie:
   ```typescript
   res.cookies.set("token", authToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === "production",
     sameSite: "strict",
     path: "/",
   });
   ```
6. The `auth` field is deleted from the response before sending to the browser.
7. The browser receives `{ action: "navigate", target_id: "/" }` and navigates.

The token **never reaches client-side JavaScript**. All subsequent requests from `middleend.ts` (server-side) read the cookie and attach it as `Authorization: Bearer`.

### Logout

There are two ways the session ends:

1. **Client-emitted** (`SDUIAction.type === "logout"` on a button): `ButtonComponent` calls `await fetch("/api/auth/logout", { method: "POST" })` then sets `window.location.href = "/login"`. No middleend round-trip. Used by a plain "Sign out" button.
2. **Server-returned** (`SDUIActionResponse.action === "logout"`): the middleend ends the session on the server side and returns `{ action: "logout", target_id: <redirect_url> }`. The dispatcher does the same `POST /api/auth/logout` to clear the cookie, then `window.location.href = target_id`. Used by destructive flows (e.g. delete account) where the session must end alongside the navigation.

Either way, `/api/auth/logout` clears the `token` HttpOnly cookie and the browser does a full reload — there is no shared client state to flush manually.

---

## 7. Other Components with Actions

| Component           | Action Types Handled        | Behavior                                              |
| ------------------- | --------------------------- | ----------------------------------------------------- |
| `ScreenComponent`   | `navigate_back`, `navigate` | Back button in header. Falls back to `router.back()`. |
| `ListItemComponent` | `navigate`                  | Click row to navigate. Supports `target: "blank"`.    |
| `NavItemComponent`  | `navigate`                  | Sidebar/bottom bar navigation links.                  |
| `ErrorComponent`    | `reload`, `refresh`         | Retry button sends reload request or refreshes page.  |

---

## 8. Adding Custom Action Types

To add a new action type:

1. Add a new `case` in `ButtonComponent.handleClick`:
   ```typescript
   case "my_custom_action":
     // Custom logic here
     break;
   ```
2. If the action requires server communication, use the existing `sendAction` helper and `handleActionResponse` for the response.
3. If other components need the action, add handling in their respective click handlers.
4. Update the `SDUIAction` type in `lib/types/sdui.ts` if new fields are needed.
