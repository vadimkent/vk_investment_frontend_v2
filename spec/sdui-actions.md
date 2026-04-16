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
}
```

Actions are in the `actions` array on any `SDUIComponent`. Button uses the first action (`actions[0]`).

---

## 2. Action Types

All action types handled by `ButtonComponent`:

| Type            | Behavior                                                                                                       | Required Fields                              |
| --------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `navigate`      | Client-side navigation via `router.push(url)`. Opens new tab if `target === "blank"`.                          | `url`                                        |
| `navigate_back` | Browser back via `router.back()`.                                                                              | (none)                                       |
| `submit`        | Collects form data from `target_id` container, sends to middleend via `/api/action` proxy, processes response. | `endpoint`, optionally `target_id`, `method` |
| `reload`        | Sends GET to middleend endpoint via `/api/action`, processes response.                                         | `endpoint`                                   |
| `refresh`       | Triggers `router.refresh()` to re-render server components.                                                    | (none)                                       |
| `open_url`      | Opens URL in a new tab via `window.open`.                                                                      | `url`                                        |
| `dismiss`       | No-op in current implementation. Reserved for modal dismiss.                                                   | (none)                                       |
| `logout`        | POSTs to `/api/auth/logout`, then navigates to `/login`.                                                       | (none)                                       |
| `toggle_theme`  | Toggles light/dark mode. Client-side only, no round-trip.                                                      | (none)                                       |

---

## 3. Form Data Collection

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
  action: "replace" | "navigate" | "refresh" | "none";
  target_id?: string;
  tree?: SDUIComponent;
  feedback?: SDUIComponent;
}
```

All action responses are processed by the central `useActionDispatcher` hook in `components/action-dispatcher.tsx`, which every interactive component (Button, Checkbox, Toggle, Select, RadioGroup) uses:

| Response Action | Frontend Behavior                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `navigate`      | `router.push(target_id)` -- client-side navigation to the given path.                                                                                                          |
| `refresh`       | `router.refresh()` -- re-runs server components to fetch fresh data.                                                                                                           |
| `replace`       | Sets `overrideMap[target_id] = tree` via `OverrideMapProvider`. `ComponentRenderer` checks the override for every id it renders and, if present, renders the override instead. |
| `none`          | No navigation. Used when the action has side effects only (e.g., sending email).                                                                                               |

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

1. Button with `logout` action calls:
   ```typescript
   await fetch("/api/auth/logout", { method: "POST" });
   router.push("/login");
   ```
2. The `/api/auth/logout` route clears the `token` cookie.
3. The user is redirected to `/login`.

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
