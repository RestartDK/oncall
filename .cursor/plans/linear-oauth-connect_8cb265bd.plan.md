---
name: linear-oauth-connect
overview: Add a “Connect Linear” OAuth2 flow (OAuth-only; no API keys) so users can export issues after authenticating with Linear. Use Authorization Code on the Hono server, store tokens in an httpOnly cookie session, and have /linear/issues use the per-user OAuth token.
todos:
  - id: env-vars
    content: Add LINEAR_OAUTH_CLIENT_ID/SECRET, PUBLIC_ORIGIN, SESSION_SECRET to server config + compose. Remove LINEAR_API_KEY/LINEAR_TEAM_ID usage from config.
    status: pending
  - id: oauth-routes
    content: Implement /auth/linear/start, /auth/linear/callback, /auth/linear/status, /auth/linear/logout on the server (publicly accessed via /api/* through the existing proxy).
    status: pending
  - id: session-cookie
    content: Implement signed/encrypted httpOnly cookie session for the Linear access token and state validation.
    status: pending
  - id: use-oauth-token
    content: Update Linear issue creation to require OAuth accessToken from session (OAuth-only; no fallback).
    status: pending
  - id: client-connect-ui
    content: Add Connect/Connected/Disconnect UI in App header and status check on load.
    status: pending
  - id: verify-e2e
    content: "Manually test: connect, export issue, disconnect, error handling."
    status: pending
  - id: typecheck-harness
    content: Run TypeScript typecheck harness at the end (server + client) and fix any errors.
    status: pending
---

# Linear OAuth Connect Plan

## Goal

Replace “bring your own Linear API key” with a **Connect Linear** button using Linear’s OAuth2 flow ([docs](https://linear.app/developers/oauth-2-0-authentication)), so each user authorizes their own workspace and the app can create issues on their behalf.

This implementation is **OAuth-only**: users must authenticate with Linear to export issues; we do **not** accept/persist Linear API keys.

## High-level flow

```mermaid
sequenceDiagram
    participant Browser
    participant ClientUI
    participant Server as HonoServer
    participant Linear

    Browser->>ClientUI: Click ConnectLinear
    ClientUI->>Server: GET /api/auth/linear/start
    Server->>Browser: 302 redirect to linear.app/oauth/authorize (state)
    Browser->>Linear: GET /oauth/authorize
    Linear->>Browser: 302 redirect back to /api/auth/linear/callback?code&state
    Browser->>Server: GET /api/auth/linear/callback?code&state
    Server->>Linear: POST https://api.linear.app/oauth/token (code_exchange)
    Linear-->>Server: access_token (+ expires_in)
    Server-->>Browser: Set-Cookie linear_session; 302 to client /

    ClientUI->>Server: POST /api/linear/issues (existing)
    Server->>Linear: createIssue using user token
    Linear-->>Server: issue id/url
    Server-->>ClientUI: 200 {id,url}
```

## Decisions (based on your answers)

- **Redirects**: support **both** local + deployed by using a `PUBLIC_ORIGIN` env var (e.g. `http://localhost:5173` in dev; `https://yourdomain.com` in prod). This avoids relying on `Host` headers that may be altered by the dev/prod proxies.
- **Token storage**: **server-managed session via httpOnly cookie** (recommended) so the client never sees the token.

## Server changes (Hono)

Files:

- [`/Users/danielkumlin/Projects/oncall/packages/server/src/index.ts`](packages/server/src/index.ts)
- (new) `packages/server/src/services/linearOAuth.ts`
- (maybe new) `packages/server/src/services/session.ts`

### 1) Add env vars

Add to deployment docs / compose:

- `LINEAR_OAUTH_CLIENT_ID`
- `LINEAR_OAUTH_CLIENT_SECRET`
- `PUBLIC_ORIGIN` (public client origin used to build redirect_uri, e.g. `http://localhost:5173` in dev)
- `SESSION_SECRET` (sign/encrypt cookie payload)

### 2) Add OAuth routes

Add endpoints (server routes are under `/auth/*`; they are accessed by the browser under `/api/auth/*` due to:\n+- Vite dev proxy rewriting `/api/*` → `/*`\n+- Nginx production proxying `/api/*` → `/*` on the server container

- `GET /auth/linear/start`
  - Generate `state` (crypto-random)
  - Store `state` in a short-lived cookie (httpOnly, sameSite=Lax)
  - Redirect to `https://linear.app/oauth/authorize?...` with:
    - `client_id`, `redirect_uri=${PUBLIC_ORIGIN}/api/auth/linear/callback`
    - `response_type=code`
    - `scope=issues:create` (minimum needed for issue creation; adjust if necessary)
    - `state`
- `GET /auth/linear/callback`
  - Validate `state` matches cookie
  - Exchange `code` for `access_token` via `POST https://api.linear.app/oauth/token` (form-urlencoded)
  - Create a session cookie containing the token (encrypted/signed)
  - Redirect to client (e.g. `${PUBLIC_ORIGIN}/`)
- `GET /auth/linear/status`
  - Returns `{ connected: boolean }` (optionally viewer info if you want)
- `POST /auth/linear/logout`
  - Clears session cookie

Implementation notes:

- Use Bun’s `crypto.randomUUID()` or `crypto.getRandomValues` on server for state.
- Use Hono cookie helpers (`setCookie`, `getCookie`) or middleware.
- Cookie flags: `httpOnly: true`, `secure: true` in prod, `sameSite: 'Lax'`, reasonable `maxAge`.

### 3) Make Linear issue creation use the OAuth token

Update [`packages/server/src/services/linear.ts`](packages/server/src/services/linear.ts) and the route in `index.ts` so:

- It reads the **user access token** from the session cookie.
- It initializes `new LinearClient({ accessToken })` (OAuth access token) instead of `apiKey`.
- It returns **401** with a clear message when not connected (OAuth-only).

## Client changes (React)

Files:

- [`/Users/danielkumlin/Projects/oncall/packages/client/src/App.tsx`](packages/client/src/App.tsx)
- [`/Users/danielkumlin/Projects/oncall/packages/client/src/lib/api.ts`](packages/client/src/lib/api.ts)

### 1) Add connect/disconnect UI

- Add a small header control:
  - **Connect Linear** button when not connected
  - **Connected** indicator + **Disconnect** when connected
- On click Connect:
  - `window.location.href = '/api/auth/linear/start'` (full-page redirect is simplest)
- On app load:
  - Call `GET /api/auth/linear/status` to set UI state.

### 2) Keep `exportToLinear()` the same shape

No token plumbing needed on the client (cookie is sent automatically). Just ensure fetch includes credentials if necessary (same-origin should work; if not, set `credentials: 'include'` in the client fetch).

## Deployment / config

- Update [`/Users/danielkumlin/Projects/oncall/docker-compose.yml`](docker-compose.yml) to pass the new OAuth env vars and remove `LINEAR_API_KEY`/`LINEAR_TEAM_ID`.
- Document required Linear OAuth app settings:
  - Callback URL(s):
    - `http://localhost:5173/api/auth/linear/callback`
    - `https://<your-domain>/api/auth/linear/callback`

## Security / why this is “best”

- Better than manual API keys: users never paste tokens into your UI.
- httpOnly cookie keeps tokens out of JS, reducing accidental leaks.
- For a hackathon, this is still lightweight; for production you’d add a proper session store + refresh token handling.

## Test plan

- Local: click Connect Linear → authorize → redirected back → status shows connected.
- Export: create a ticket and click Export → issue appears in the authorized workspace.
- Logout: disconnect clears cookie; export should fail with a clear “not connected” error.

## TypeScript harness (run at the very end)

- Server types:
  - `bun run --cwd "/Users/danielkumlin/Projects/oncall/packages/server" build:types`
- Client types:
  - `bunx --cwd "/Users/danielkumlin/Projects/oncall/packages/client" tsc -b`