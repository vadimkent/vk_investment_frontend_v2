# Acceptance Criteria

- [ ] The Next.js server renders a screen by fetching an SDUI component tree from the middleend and returning HTML via SSR.
- [ ] The browser never issues requests to the middleend or the backend directly; all outbound calls go through Next.js route handlers.
- [ ] The component registry renders every component in the base SDUI set and silently ignores unknown component types.
- [ ] User actions (form submits, navigations, mutations) are forwarded to the middleend and the resulting tree replaces or updates the current view.
- [ ] Auth session cookies are HTTP-only, Secure, and SameSite; no tokens are exposed to client-side JavaScript.
- [ ] The healthcheck endpoint returns 200 when the Next.js server is running.
- [ ] Middleend unavailability and 5xx responses produce a generic error screen and a structured server-side log entry.
- [ ] `cli build`, `cli lint`, and `cli test` succeed on a clean checkout.
