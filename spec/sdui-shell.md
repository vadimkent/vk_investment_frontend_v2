# SDUI Shell

The shell is the persistent outer frame of the application -- navigation, header, footer -- that wraps every screen. It is fetched once from the middleend and rendered server-side.

---

## 1. How the Shell Works

The shell lives in a Next.js route group layout so it is fetched once and persists across client-side navigations. Screens rendered inside the group become the layout's `children` and are surfaced in the `content_slot` via React context.

```
app/
├── (shell)/
│   ├── layout.tsx   → fetchShell()  → renders shell tree, wraps children in ShellChildrenProvider
│   ├── page.tsx     → fetchScreen("/screens/home")  → renders the screen (becomes layout children)
│   └── <other routes with shell>
├── screens/[...path]/page.tsx  → standalone screens without shell (login, register)
└── layout.tsx       → root html/body
```

The shell tree is a top-level container whose children include layout slots and a `content_slot`. `ContentSlotComponent` reads the current screen from context and renders it in place. Layouts in Next.js App Router do not re-render on client-side navigation between pages under the same layout, so the shell fetch happens only on the first SSR of the group.

---

## 2. Shell Fetching

Defined in `lib/middleend.ts.tmpl`:

```typescript
export async function fetchShell(platform?: string): Promise<SDUIComponent> {
  return fetchSDUI("/shell", platform);
}
```

- Runs server-side only (uses `next/headers` for cookies).
- Sends `X-Platform` header so the middleend can return platform-specific navigation.
- Sends `Authorization: Bearer <token>` from the HttpOnly cookie (if present).
- Uses `cache: "no-store"` for fresh data on every request.

---

## 3. Screen Injection via Context

`ContentSlotComponent` is a client component that consumes the React node provided by `ShellChildrenProvider`:

```tsx
// components/base/ContentSlot.tsx
"use client";
import { useShellChildren } from "@/components/shell-children-context";

export function ContentSlotComponent() {
  const slot = useShellChildren();
  return <div className="flex-1">{slot}</div>;
}
```

The layout wraps its children with the provider:

```tsx
// app/(shell)/layout.tsx
const shell = await fetchShell();
return (
  <ShellChildrenProvider value={children}>
    <ComponentRenderer component={shell} />
  </ShellChildrenProvider>
);
```

This avoids mutating the SDUI tree. The shell is rendered as-is, and whenever `ComponentRenderer` reaches a `content_slot`, the screen's React output is slotted in through context.

---

## 4. Navigation Types (`nav_type`)

The middleend returns a shell as a `screen` component with `nav_type` in props and nav slot children (`nav_header`, `nav_main`, `nav_footer`, `bottombar`, `content_slot`) as flat direct children. The **frontend reads `nav_type`** and arranges the slots into the corresponding layout (per the workflow spec `07-sdui.md §7.3`).

| `nav_type`      | Layout                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar`       | Grid with collapsible left column: `240px 1fr` when expanded, `64px 1fr` when collapsed (animated via `transition-[grid-template-columns]`). Left: nav_header + nav_main + nav_footer in a sticky sidebar with `bg-surface-sidebar`. Right: content_slot.       |
| `bottombar`     | Flex column. Optional nav_header at top, content_slot middle, bottombar fixed at bottom.                                                                                                                                                                        |
| `header_footer` | Flex column. nav_header + nav_main at top (bordered), content_slot middle, nav_footer at bottom (bordered).                                                                                                                                                     |
| `header_only`   | Flex column. nav_header + nav_main at top (bordered), content_slot below.                                                                                                                                                                                       |
| (absent)        | Standard page. No nav chrome. Used for login, onboarding, standalone screens.                                                                                                                                                                                   |

The middleend controls **which slots** appear and **what's inside them**. The frontend controls **where they go** based on `nav_type`.

### Sidebar collapse

The `sidebar` layout supports a collapsed state, toggled by the client-side `toggle_sidebar` action and persisted in a cookie named `sidebar-collapsed` (1-year max-age, `path=/`, `samesite=lax`). The cookie is read on the server in `app/layout.tsx` via Next's `cookies()` API and passed to `SidebarProvider` as `initialCollapsed`, so the server's first render already matches the user's persisted preference and there is no hydration mismatch on hard reloads. The `SidebarProvider` context (mounted in the root layout) writes the cookie on every state change and exposes `collapsed` so any component can read it.

To control which children render in each state, any nav child can declare `sidebar_visibility` in its props:

| Value       | Renders when collapsed | Renders when expanded |
| ----------- | ---------------------- | --------------------- |
| `always` (default) | yes              | yes                   |
| `collapsed` | yes                    | no                    |
| `expanded`  | no                     | yes                   |

The filter recurses into `children` so groups of items can be marked en masse. Useful for hiding labels in collapsed mode or showing alternative compact representations.

---

## 5. Named Slots

Shell slot components and their roles:

| Slot Component | React Component        | Purpose                                                                                            |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `nav_header`   | `NavHeaderComponent`   | Brand/logo area at top of sidebar. Renders children (typically `image` + `text`). Bordered bottom. |
| `nav_main`     | `NavMainComponent`     | Scrollable navigation list. Contains `nav_item` children. Renders as `<nav>`.                      |
| `nav_footer`   | `NavFooterComponent`   | Bottom of sidebar. User info, settings, logout. Bordered top.                                      |
| `nav_item`     | `NavItemComponent`     | Individual nav link. Icon + label + optional badge. Handles navigate action on click.              |
| `bottombar`    | `BottomBarComponent`   | Fixed bottom tab bar. Contains `nav_item` children distributed with `justify-around`.              |
| `content_slot` | `ContentSlotComponent` | Injection point for screen content. Renders as `div.flex-1`.                                       |

---

## 6. Platform Detection

The `X-Platform` header is set in `lib/middleend.ts.tmpl` via the `serverHeaders` function:

```typescript
async function serverHeaders(
  platform?: string,
): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    "X-Platform": platform ?? "web",
    "Content-Type": "application/json",
  };
  // ... auth token from cookie
}
```

- The `platform` parameter defaults to `"web"` when not provided.
- `fetchShell` and `fetchScreen` both accept an optional `platform` parameter.
- In the default `page.tsx.tmpl`, no platform override is passed, so it always sends `"web"`.
- To support dynamic platform detection (e.g., detecting mobile browsers), pass a different value to `fetchShell(platform)` based on the request's User-Agent or viewport hints. This is a server-side decision since `middleend.ts` runs in a Next.js server component.

---

## 7. Example Shell Tree

A typical sidebar shell returned by `GET /shell`:

```json
{
  "type": "column",
  "id": "shell-root",
  "props": {},
  "children": [
    {
      "type": "row",
      "id": "shell-layout",
      "props": { "widths": ["240px", "1fr"] },
      "children": [
        {
          "type": "column",
          "id": "sidebar",
          "props": {},
          "children": [
            {
              "type": "nav_header",
              "id": "nav-hdr",
              "props": {},
              "children": [
                {
                  "type": "text",
                  "id": "brand",
                  "props": { "content": "My App", "weight": "bold" }
                }
              ]
            },
            {
              "type": "nav_main",
              "id": "nav-body",
              "props": {},
              "children": [
                {
                  "type": "nav_item",
                  "id": "nav-home",
                  "props": { "label": "Home", "icon": "H" },
                  "actions": [
                    { "trigger": "click", "type": "navigate", "url": "/" }
                  ]
                },
                {
                  "type": "nav_item",
                  "id": "nav-settings",
                  "props": { "label": "Settings", "icon": "S" },
                  "actions": [
                    {
                      "trigger": "click",
                      "type": "navigate",
                      "url": "/settings"
                    }
                  ]
                }
              ]
            },
            {
              "type": "nav_footer",
              "id": "nav-ftr",
              "props": {},
              "children": [
                {
                  "type": "button",
                  "id": "logout-btn",
                  "props": {
                    "label": "Logout",
                    "variant": "secondary",
                    "style": "ghost"
                  },
                  "actions": [{ "trigger": "click", "type": "logout" }]
                }
              ]
            }
          ]
        },
        {
          "type": "content_slot",
          "id": "main-content",
          "props": {}
        }
      ]
    }
  ]
}
```

After `injectScreen`, the `content_slot` gains the screen tree as its child, and the entire merged tree is rendered by `ComponentRenderer`.

---

## 8. Authentication and 401 Handling

The shell requires authentication. If the middleend returns 401, the response includes a `redirect` field:

```json
{ "error": "unauthorized", "redirect": "/screens/login" }
```

**Server-side (fetchShell, fetchScreen):** `lib/middleend.ts` detects 401 and calls `redirect(loginPath)` from `next/navigation`, which redirects the browser to the login page.

**Client-side (actions via /api/action):** The route handler passes the 401 to the browser. `Button.tsx`'s `sendAction` detects `response.status === 401`, reads `body.redirect`, and calls `router.push(redirect)`.

Auth screens (login, register) render without the shell — they are standalone screens that don't call `fetchShell`.
