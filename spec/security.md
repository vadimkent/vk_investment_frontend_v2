# Security & Auth

## Authentication

Authentication is delegated to the middleend. The frontend forwards credentials and session tokens received from the browser to the middleend and returns responses back.

| Aspect          | Behavior                                                          |
| --------------- | ----------------------------------------------------------------- |
| Session storage | HTTP-only, Secure, SameSite cookies set by the middleend          |
| Token handling  | Never exposed to client-side JavaScript                           |
| Origin          | The Next.js server is the only public edge; middleend is internal |

## Security Rules

- The browser never communicates with the middleend or backend directly.
- All outbound calls from the Next.js server target the middleend over an internal network.
- Secrets (middleend base URL credentials, signing keys) live in server-only environment variables.
- Standard web hardening is applied: CSP, HSTS, and secure cookie flags.
