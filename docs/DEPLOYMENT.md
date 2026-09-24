# Hosting and deployment

The verified deliverable is a local Windows/PostgreSQL application. A Quick Tunnel is a temporary development preview, not production. Do not tunnel the default local demo: its known accounts and intentional location/reset controls are for a private laptop.

## Production build and runtime

Use Node 22 LTS, a PostgreSQL 17-compatible managed database, and an HTTPS reverse proxy/platform. The API can serve `client/dist`, avoiding cross-origin auth for the simplest deployment.

```bash
npm ci --prefix server
npm ci --prefix client
node scripts/build-public.mjs
# Inject DATABASE_URL, JWT_SECRET, NODE_ENV=production, HOST=0.0.0.0,
# PORT and CLIENT_ORIGIN from the platform's secret/settings store.
npm run db:setup
npm --prefix server start
```

`NODE_ENV=production` makes demo mode false regardless of DEMO_MODE. Seed accounts are not created in that mode; existing demo accounts are rejected at login and JWT middleware. `build-public.mjs` excludes the visible demo credentials from browser assets. Use a fresh production database or remove seeded accounts deliberately through an audited migration before launch. Never use `demo123` for a public account.

Production requires a long random JWT secret; store it and DATABASE_URL in the host secret manager. Keep OPENAI_API_KEY only in backend settings, blank if unused. Rotate keys if leaked. Do not log tokens, passwords, request authorization or connection URLs. Use a restricted application DB role; separate schema-migration privileges from runtime privileges as the deployment matures.

For split frontend/backend hosting, set `VITE_API_URL` at frontend build time and `CLIENT_ORIGIN` to the exact HTTPS frontend origin. CORS is not authorization. Bearer auth remains enforced. Evaluate HttpOnly secure cookies/CSRF or short-lived tokens with refresh rotation for production; the demo's sessionStorage JWT is exposed to same-origin XSS and lacks individual-token revocation.

## Database, migrations and backups

- Use managed PostgreSQL with private networking, TLS verification, a small connection pool and firewall restrictions. Provide the provider's CA as required; do not disable certificate verification just to connect.
- Run `npm run db:setup` once per fresh deployment. It creates initial tables and seeds idempotently; it is not a general schema-diff tool. Add numbered versioned migrations before changing existing table structure.
- Use automated daily backups plus point-in-time recovery; document retention and perform restore drills into a separate database. Take a backup before every destructive migration.
- Enable slow query monitoring and inspect leaderboard plans with realistic load. The current pool is 10 connections per process; account for all replicas before choosing pool sizes.
- Never run development tests or `db:reset` against production. Public mode refuses reset, and tests should have a separate disposable database.

## HTTP, security and operations

Terminate HTTPS at a trusted proxy; redirect HTTP to HTTPS and configure HSTS appropriately. GPS on public origins requires HTTPS. Helmet sets defensive headers/CSP. The body limit is 16KB, auth is bcrypt/JWT, SQL is parameterized, and organizer functions check roles server-side. Rate limits are 30 auth requests/minute and 240 API requests/minute per process/IP. Configure known proxy hops precisely so rate limiting sees the correct client IP; never set `trust proxy=true` without understanding the deployment.

Add structured request IDs, method/path/status/latency, and metrics for DB failures, completion conflicts, API errors and clue fallback rates. The current centralized errors intentionally hide raw DB/provider errors; production needs sanitized internal logs for diagnosis. `/api/health` checks the database and returns 503 when unavailable. Configure readiness probes against that route and process restarts with backoff.

The current app does not include password reset, email verification, refresh-token rotation, account deletion workflows, privacy/consent management or anti-cheat. Address them before opening a real event to the public. Player positions are visible to other joined players for five minutes; define consent/retention and limit precision where appropriate. Seed/reset/simulation tools are development-only; arbitrary role elevation is not exposed through registration.

## CI and release

`.github/workflows/verify.yml` installs from lockfiles, provisions PostgreSQL, initializes the schema, runs the real API/database suite and builds the frontend. Configure branch protection and required checks in the hosting organization if desired. Review dependency advisories, transaction changes and auth logic. CI configuration alone is not evidence that a hosted run passed; check its run status. Deploy a reviewed commit, run health/auth smoke checks, and keep a rollback image/build plus compatible database migration plan.

## Map sourcing and attribution

`client/public/campus.svg` is an original locally bundled schematic. It makes no claim to be a surveyed campus map. Checkpoint coordinates are illustrative. Online tiles use `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with OpenStreetMap attribution. Follow [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and [copyright attribution](https://www.openstreetmap.org/copyright). Do not bulk-download public tiles for offline use; use the included original illustration or a properly licensed tile provider/self-hosted tile solution at scale.

## Scaling live updates

Three REST reads per player every 2.5 seconds are appropriate locally. At 1,000 active users that is roughly 1,200 reads/second before mutations. First consolidate snapshots, cache shared leaderboard reads, add conditional responses, reduce hidden-tab polling, paginate and load-test. Later broadcast change notifications with authenticated WebSockets or a hosted pub/sub layer while keeping mutations REST and PostgreSQL authoritative. SSE can work on some hosts, but **Cloudflare Quick Tunnels do not support SSE**, so this app deliberately uses polling.

## Temporary Cloudflare Quick Tunnel — exact commands

Cloudflared was not installed on this laptop during delivery, so no live public URL was launched or claimed verified. This is the concrete preview blocker. If you install it later, use only the safe preview process below, not port 3001. See [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/) for limitations (including 200 in-flight requests and no SLA).

Windows PowerShell, repository root:

```powershell
winget install --id Cloudflare.cloudflared --exact
node scripts/build-public.mjs
node scripts/preview.mjs
```

In another repository terminal:

```powershell
cloudflared tunnel --url http://127.0.0.1:3003
```

On Linux/macOS, install cloudflared using Cloudflare's official instructions and run the same three `node`/`cloudflared` commands. `preview.mjs` uses a separate random local JWT secret, port 3003, production mode and disabled demo controls/accounts. It refuses a build that still contains demo credential text. It uses the configured database, so keep the database running. Register a unique non-demo test account on the preview; no organizer role is given automatically.

Before sharing the printed `https://...trycloudflare.com` URL, verify health, ensure the login page does not show demo credentials, confirm demo account login fails, register/login a test account, and confirm `/api/demo/reset` and `/api/demo/arrival` return 403 with its JWT. Do not share `.pats`, `.env`, local logs or screenshots containing secrets. The static server exposes only built client assets, not repository files. Basic public participation is available, but the room-friendly simulated arrival controls remain local-only; production gameplay needs real GPS near the illustrative destinations and is not a verified real-campus event.

Stop the tunnel and preview with Ctrl+C in their respective terminals. It depends on this laptop, PostgreSQL, the API process and internet remaining online, and its URL changes between runs. Rebuild the local edition with `npm run demo` afterward to restore local demo instructions. For a durable service, use managed hosting and managed PostgreSQL instead.
