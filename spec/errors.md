# Error Handling

| Category                  | Behavior                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Middleend unavailable     | Render a generic error screen; log the incident server-side                                                |
| Middleend returns 4xx     | Render the SDUI error tree supplied by the middleend when present; otherwise render a generic error screen |
| Middleend returns 5xx     | Render a generic error screen; log the incident server-side                                                |
| Unknown SDUI component    | Ignore the component; log a warning with its `type`                                                        |
| Client-side runtime error | Caught by error boundary; render a generic recovery screen                                                 |
| Network failure on action | Surface a user-facing retry affordance; do not corrupt local form state                                    |

Logs are structured and correlate a request identifier across the Next.js server and the middleend.
