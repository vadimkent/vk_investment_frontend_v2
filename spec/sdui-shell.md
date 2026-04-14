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

The middleend returns a shell with navigation components based on the platform and app configuration. The frontend does not switch on a `nav_type` value directly -- it simply renders the components present in the shell tree. Common patterns:

| Pattern          | Shell Children                                            | Visual Result                                                                          |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Sidebar          | `nav_header` + `nav_main` + `nav_footer` + `content_slot` | Left sidebar with header, scrollable nav items, footer. Content fills remaining space. |
| Bottom bar       | `content_slot` + `bottombar`                              | Content area with fixed bottom tab bar.                                                |
| Minimal          | `content_slot` only                                       | No navigation chrome. Used for login, onboarding.                                      |
| Sidebar + Bottom | All of the above                                          | Sidebar for desktop, bottom bar for mobile (middleend decides per platform).           |

The middleend controls which navigation components appear. The frontend renders whatever it receives.

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
