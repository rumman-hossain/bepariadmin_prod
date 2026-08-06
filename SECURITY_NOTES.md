# Security notes — admin console

Standing decisions and assessments, so they are not re-litigated every time
someone runs `npm audit` or reads a header config.

---

## Open advisory: react-router RSC CSRF (GHSA-qwww-vcr4-c8h2)

**Status: not applicable. Do not downgrade.**

`npm audit` reports two high-severity advisories against `react-router` and
`react-router-dom` (currently 7.18.2). The advisory range is 7.12.0 – 8.2.0, and
there is no patched release inside 7.x — `npm audit fix --force` would install
**7.11.0**, giving up seven minor versions of unrelated fixes.

The vulnerability requires **RSC mode**: a server that executes router actions
before returning a 400. This app has none of the preconditions.

| Precondition | This app |
|---|---|
| RSC mode enabled | No RSC API is imported anywhere in `src/` |
| Route `action` handlers | None — every route is `element`-only |
| Route `loader` handlers | None |
| Server-side rendering | None. `createBrowserRouter`, client-only |
| A server running the router | None. Static SPA on Firebase Hosting |

Re-check with:

```bash
grep -rnE '^\s*(action|loader):' src/router/index.tsx   # expect no output
grep -rn 'renderToString\|entry.server\|unstable_' src  # expect no output
```

**Revisit if** the console ever adopts router `action`/`loader` data APIs, or
moves to a server-rendered setup. At that point the preconditions become real
and the version must move.

---

## Why `connect-src 'self'` is sufficient

`firebase.json` proxies `/api/**`, `/health` and `/uploads/**` to the Cloud Run
backend as **rewrites**, so the API is same-origin from the browser's point of
view. That is what lets the CSP stay at `connect-src 'self'` while still
reaching the backend, and it is also why the `HttpOnly` refresh cookie works
with `credentials: 'include'` without any CORS configuration.

If the API is ever moved to a separate origin, `connect-src` must be widened to
name it explicitly — and the refresh cookie becomes cross-site, which needs
`SameSite=None; Secure` and a matching CORS policy. Do not widen `connect-src`
to a wildcard.

---

## The token model

- Access token lives in a **module-scope closure** (`src/auth/memoryTokenStore`).
  It is never written to `localStorage`, `sessionStorage`, a cookie, or a URL.
- Refresh token is an **`HttpOnly` cookie** set by the backend, unreachable from
  JavaScript by design.
- Refresh is a **singleton with queued waiters**, so a burst of 401s produces one
  refresh, not one per request.
- The cookie is **host-only**, `Secure`, `HttpOnly` and `SameSite=Strict`, and a
  staff session lasts **12 hours** with an absolute cap the server enforces on
  rotation — so refreshing does not extend it indefinitely.

The cookie is named `__session` and cannot be renamed `__Host-session`, which
would otherwise make those rules browser-enforced: Firebase Hosting strips every
cookie except that exact name. The invariants are pinned by a backend test
instead (`pkg/auth/web_session_test.go`).

**Nothing but the theme preference reaches web storage, and `guard:web-storage`
now fails the build on any `localStorage`/`sessionStorage`/`document.cookie` use
outside the ThemeProvider.** This was true before and enforced by nothing; one
`localStorage.setItem` in a hurry undoes the entire XSS defence and looks
perfectly reasonable in review.

Every authenticated request goes through the same freshening path, including
uploads. `src/services/upload/api.ts` builds its own headers for per-call
timeouts, and used to send a bare `getAccessToken()` — no expiry check, no
refresh, no retry — so a stale add-product tab failed with `Upload failed (401)`
and lost the draft. It now uses `getFreshAccessToken()` with headroom longer than
its own timeout, plus one 401-refresh-replay.

A failed refresh clears the cached access token before flushing the queue. This
matters: the flush hands every waiter `getAccessToken()`, so leaving a dead token
cached would release the whole queue holding it and produce a 401 storm instead
of a clean re-authentication. Covered by
`src/api/__tests__/client.test.ts`.

---

## Retries are restricted to idempotent methods

`src/api/client.ts` retries only `GET`, `PUT` and `DELETE`, on 5xx and on
timeout. `POST` and `PATCH` are never replayed.

A timeout is the most dangerous case: the server may have received and applied
the request and simply not answered in time. No `Idempotency-Key` is attached
anywhere in `src/api`, so the server cannot collapse duplicates either — which
means a replayed `POST` is a duplicate account, a duplicate password reset, or a
duplicate product.

**If an `Idempotency-Key` is ever added**, `POST` may join the replayable set —
not before.

---

## Frontend role checks are not a security boundary

`src/auth/roles.ts` gates UI affordances by staff role. Everything there runs on
the user's machine and can be edited by them. The backend's `AdminOnly`,
`StrictAdminOnly` and `SuperAdminOnly` middleware are the enforcement point.

What the frontend checks buy: people are not shown buttons the server will
reject, and a backend gap is not immediately reachable through ordinary UI.
`hasRole` **fails closed** — an unrecognised role gets nothing.

---

## Backend items

Security findings that need backend changes are tracked in
`../beparibd-backend/docs/ADMIN_API_GAPS.md` under "Security items".

**S1 and S4 are done** (2026-08-02): the refresh cookie is host-only and
`SameSite=Strict` with a 12-hour staff session and a server-enforced absolute
cap, and changing a password now evicts every other device. A cross-site check
was also added to the two cookie-authenticated endpoints
(`/auth/refresh`, `/auth/logout-session`) — the only CSRF surface in the API,
since everything else carries a bearer token.

**S2 is the one that still matters.** `AdminOnly` is missing on the catalog
mutation routes, so any authenticated principal can mutate the shared catalogue.
The `RequireRole` gate in this app is presentation only — it runs on the user's
machine and does not close that hole. S3 (raw Postgres text on the wire) is
contained at the display layer but still leaks schema names to any proxy or log.

Passkeys/WebAuthn are designed but not built, in the same document. Password plus
an emailed six-digit code is two factors but is not phishing-resistant: a
reverse-proxy phishing page captures and replays both inside their validity
window. That is the next real upgrade to sign-in.
