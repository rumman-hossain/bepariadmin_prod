# BepariBD Admin

Admin console for the BepariBD platform. Vite + React 19 + TypeScript + Tailwind v4.

## Run locally

**Prerequisites:** Node.js 22+

```bash
npm install
npm run dev:local        # http://localhost:3000
```

Open **`http://localhost:3000`**, not `127.0.0.1:3000` — only `localhost` origins are in
the backend's CORS allowlist, and the login password hasher needs `crypto.subtle`, which
the browser only exposes in a secure context.

## Two profiles

The app makes all requests with relative paths (`API_BASE_URL` is `''` in
`src/utils/constants.ts`), so what changes between profiles is the Vite dev-server proxy
target — the same shape as the Firebase Hosting rewrites used in production.

| | backend it talks to |
|---|---|
| `npm run dev:local` | your own Go server on `http://localhost:8080` |
| `npm run dev:gcp` | the deployed Cloud Run dev service — no local backend needed |

`npm run dev` is an alias for `dev:local`.

Targets live in `.env.dev-local` and `.env.dev-gcp` (committed; they hold only a URL). To
point somewhere else for one run:

```bash
VITE_API_PROXY_TARGET=http://localhost:9090 npm run dev:local
```

There is no `VITE_API_BASE_URL` — the proxy is the only supported knob.

### Running against a local backend

```bash
cd ../beparibd-backend
make dev-local      # proxy + containers + server on :8080, one command
```

Then `npm run dev:local` here. `make down` in the backend stops everything.

See `../beparibd-backend/docs/ENVIRONMENTS.md`. Note the backend's `local` profile still
uses the **shared GCP dev database**; only its identity and GCS/email are local.

## Scripts

| | |
|---|---|
| `npm run dev:local` / `dev:gcp` | dev server on `:3000` |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Notes

- Auth is a custom JWT flow: the password is hashed in the browser (PBKDF2-HMAC-SHA256 via
  the local `nextgen-password` package), the access token is held in memory only, and the
  refresh token is an httpOnly `__session` cookie. Nothing is kept in localStorage.
- `PBKDF2_ITERATIONS` in `src/utils/constants.ts` must stay at 310,000 — the backend and
  mobile client both pin that value.
- `nextgen-password` is a file dependency on `../bepari-password`. If you edit it, run
  `npm run build` in that directory.
