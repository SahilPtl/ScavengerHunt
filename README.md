# MNNIT Campus Scavenger Hunt

A playable React + Node + PostgreSQL multiplayer hunt with six clues, a Leaflet map, server-owned scoring, JWT login and a shared leaderboard. Two real users can play together. Optional simulated opponents are labeled. **The full local demo needs neither OAuth credentials nor an OpenAI key.**

Rebuilt in September 2026 from the earlier prototype. Read [the inspection and rebuild record](docs/REBUILD_NOTES.md) for the truthful history. The prior main branch is preserved at [archive/pre-rebuild-2026-09-25](https://github.com/SahilPtl/ScavengerHunt/tree/archive/pre-rebuild-2026-09-25).

## Open this laptop's project

```powershell
code 'C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt'
cd 'C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt'
npm run demo
```

Open **http://127.0.0.1:3001**. This laptop has a dedicated PostgreSQL 17 cluster at `.local/postgres`, database `scavenger_hunt`, role `hunt_app`, port `55432`. Its random password is already stored only in ignored local files. The installed PostgreSQL services were not modified. **Do not replace the working `server/.env` with the example.**

Windows reserves the common ports 5000 and 5173 on this laptop. This project uses **3001** for the API and built UI, **3002** for Vite development, and **3003** for a separately configured safe preview.

| Session | Email | Local-only password |
|---|---|---|
| Explorer One / organizer | demo@mnnit.com | demo123 |
| Explorer Two | player2@mnnit.com | demo123 |

Open two independently created tabs, or two browsers. JWTs live in `sessionStorage`, so different tabs can log in separately. Avoid duplicating an already logged-in tab because browsers may copy its session storage. Logout and use the second account if needed.

## What works

- Registration, bcrypt password hashes, JWT bearer authentication, protected routes.
- Idempotent joining, named players/teams, PostgreSQL persistence across refresh/restart.
- Six prepared clues and hints; exact destinations are hidden in ordinary clue responses.
- Haversine distance validation; checkpoint order; transactionally safe completion and score.
- Hint cost of 20 points, once per checkpoint (scores can temporarily be negative).
- 100 checkpoint points, up to 50 speed points, 200 final completion points.
- Two real players plus three explicitly labeled simulated opponents.
- Leaderboard, progress and player location polling every 2.5 seconds, with effect cleanup.
- Browser GPS and explicit **Demo Location Mode**, using the same server completion logic.
- Original bundled campus SVG under Leaflet, visible without external tiles; optional OSM.
- Current-user reset, optional organizer simulation and optional AI clue drafts.
- Completion summary includes score, time, six checkpoints and current leaderboard rank.
- Responsive desktop/tablet/mobile UI. No paid API, Docker or physical visit needed locally.

## One-time setup on a fresh Windows clone

Install Node.js 20+ (Node 22 LTS recommended), Git, VS Code and PostgreSQL 17. PostgreSQL installer credentials are yours; do not send passwords in chat or commit them.

```powershell
git clone https://github.com/SahilPtl/ScavengerHunt.git
cd ScavengerHunt
npm ci --prefix server
npm ci --prefix client
```

Choose **one** database option.

**A. Separate project-local PostgreSQL cluster (recommended for this laptop)**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres.ps1
npm run demo
```

The setup script uses `C:\Program Files\PostgreSQL\17\bin`, creates only `.local/postgres`, generates a password, binds PostgreSQL to `127.0.0.1:55432`, creates `scavenger_hunt`, and writes `server/.env`. It refuses to overwrite an existing `.env`. This is one-time. Tomorrow use only `npm run demo` (or `powershell -ExecutionPolicy Bypass -File .\demo.ps1`). No administrator service installation is required.

**B. Your existing PostgreSQL service**

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 5432 -U postgres -d postgres -W
```

In psql:

```sql
CREATE ROLE hunt_app LOGIN;
\password hunt_app
CREATE DATABASE scavenger_hunt OWNER hunt_app;
\q
```

Copy `server/.env.example` to `server/.env`, then set `DATABASE_URL` to your new role/password/database. Percent-encode special characters in URL passwords. Run `npm run db:setup`, then `npm run demo`. Do not reset the password of an existing shared role.

## Linux / WSL setup

Use PostgreSQL and Node installed **inside WSL**, rather than assuming WSL localhost reaches a Windows-only database.

```bash
sudo apt update
sudo apt install postgresql postgresql-client
sudo service postgresql start
sudo -u postgres psql
```

Run the same role/database SQL above, then:

```bash
git clone https://github.com/SahilPtl/ScavengerHunt.git
cd ScavengerHunt
cp server/.env.example server/.env
# Edit DATABASE_URL for your WSL PostgreSQL role and password.
npm ci --prefix server
npm ci --prefix client
npm run demo
```

Node 20+ must also be installed. WSL start was documented but not executed on this laptop. PostgreSQL service lifecycle on WSL is managed by `service`/systemd, not the Windows cluster helper.

## Environment files

`server/.env` is optional if an appropriate `DATABASE_URL` already exists in the environment or the safe default connection works. A missing file does not crash dotenv. Default DB URL is `postgresql://postgres@127.0.0.1:5432/scavenger_hunt`; password-authenticated services require configuration. **There is no embedded database password.**

```dotenv
DATABASE_URL=postgresql://hunt_app:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/scavenger_hunt
PORT=3001
HOST=127.0.0.1
CLIENT_ORIGIN=http://localhost:3002
JWT_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
DEMO_MODE=true
```

`YOUR_LOCAL_PASSWORD` is a setup instruction, not a shipped secret. This laptop's generated URL already uses port 55432. In development only, an absent JWT secret creates a random persisted `.local/jwt-secret`. Production refuses to start without a secret. `.env`, `.local`, passwords, logs and dependencies are Git-ignored.

No `client/.env` is needed. Optional content:

```dotenv
VITE_API_URL=/api
```

The same-origin `/api` path works with Vite's proxy and the built app served by Express. Never add API keys to `VITE_*` settings; Vite embeds them in browser assets.

## Daily start, stop and safe reset

```powershell
npm run demo
# Ctrl+C stops the API; the project database may remain running.
# In another repository terminal, stop API + the project database:
npm run stop
# Reset only seeded demo runs (database must be running):
npm run db:reset
npm run db:setup
```

`demo` checks Node, installs missing dependencies from lockfiles, starts the dedicated cluster if needed, applies idempotent schema/seeds, builds the frontend, starts Express, waits for DB-backed health, and prints URL/credentials. If it reports an occupied port, stop the previous run rather than killing unrelated processes. `db:setup` preserves accounts and progress. `db:reset` deletes only participant runs belonging to seeded demo accounts, preserving registered users and their runs. Inside the app, **Reset my run → Confirm reset** affects only the authenticated player.

**Offline recovery:** install dependencies and build while online once. Keep `.local/postgres`, `server/.env`, `node_modules` and `client/dist` locally. `npm run demo` can then rebuild/start without internet. Use the default **Offline campus schematic**, Demo Location Mode and prepared clues. Do not delete these local folders before the interview.

## Separate development terminals

```powershell
# Terminal 1, from repository root
cd server
npm install
npm run dev
# Terminal 2, from repository root
cd client
npm install
npm run dev
```

Both packages have real `dev` scripts: server uses `nodemon server.js`, client uses Vite. Visit `http://127.0.0.1:3002`. Stop a running `npm run demo` before running the development backend because both use API port 3001. Schema/seeds must already be initialized. `npm run build` creates production client assets; `npm --prefix server start` serves them.

## Five-minute two-browser demo

1. Open `http://127.0.0.1:3001` in two independent tabs or browsers. Sign in as Explorer One and Explorer Two.
2. Both click **Start / resume hunt**. Show two real player rows; simulated players have a separate label.
3. Explain the prepared clue and offline map. Turn on **Demo Location Mode** in both sessions.
4. Explorer One clicks **Simulate arrival**, then **Check location**. Show the score, next clue and trail.
5. Switch to Explorer Two. Within about 2.5 seconds its leaderboard shows Explorer One's progress. Complete Explorer Two's first checkpoint as well.
6. Refresh Explorer One. Score, checkpoint, start time and location persist. Re-enable the demo switch after refresh.
7. Request a hint on a remaining checkpoint; show the one-time 20-point deduction. Repeat arrival/check through checkpoint six.
8. Show the completion summary and Explorer Two's updated leaderboard. Click **Reset my run → Confirm reset**; Explorer Two keeps its progress.
9. Optional: open organizer studio and draft a library clue. Without a key it immediately returns **Prepared clue**. This is an honest fallback, not fresh AI output.

## Architecture and repository structure

```text
client/
  public/campus.svg            original offline schematic
  src/components/              layout, map, leaderboard, timer
  src/hooks/                   auth context and polling
  src/pages/                   auth, dashboard, game, leaderboard
  src/services/api.js          centralized Fetch / JWT / errors
  src/App.jsx, main.jsx, styles.css
server/
  app.js, server.js, config.js Express, lifecycle, environment
  auth.js, routes.js           authentication and REST handlers
  services/game.js             transactions and game rules
  services/clues.js            backend-only OpenAI / fallback
  database/schema.sql         idempotent schema
  database/seed.sql            complete six-clue hunt
  database/setup.js, reset.js  development accounts / safe reset
  tests/game.test.js           real database + HTTP tests
scripts/                      startup, PostgreSQL, stop, preview
docs/                         interview, cheatsheet, deployment, verification
.github/workflows/verify.yml   PostgreSQL CI checks
```

React → centralized Fetch → Express auth/routes → game service → parameterized SQL → PostgreSQL. Express serves the built UI so the daily demo needs only one HTTP port. Completion and hints use transactions with `SELECT ... FOR UPDATE` on the participant. A composite completion primary key provides another duplicate guard.

## Data model

`users` 1:N `hunt_participants` N:1 `hunts`; `hunts` 1:N `checkpoints`; participant 1:N `checkpoint_completions` and `hints_used`; participant 1:0..1 `player_locations`. Unique `(hunt_id,user_id)` prevents duplicate joining, and `(participant_id,checkpoint_id)` prevents duplicate rewards/hints. The location belongs to a specific participant/hunt. Times are PostgreSQL `TIMESTAMPTZ` values. Score is stored for cheap reads and verified against completion points minus hint costs.

Raw SQL setup is also possible (accounts require the JavaScript setup step for bcrypt hashing):

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 55432 -U hunt_app -d scavenger_hunt -W -f server/database/schema.sql
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 55432 -U hunt_app -d scavenger_hunt -W -f server/database/seed.sql
npm run db:setup
```

Prefer `npm run db:setup`: schema and seeds run in one transaction. These initial migrations are idempotent `CREATE TABLE IF NOT EXISTS` and conflict-safe inserts; future schema changes need explicit versioned migrations, not edits that silently assume existing tables changed.

## API reference

Responses are `{success:true,data:...}` or `{success:false,message:...}`. Protected requests carry `Authorization: Bearer <JWT>`. The token determines the user; supplied user IDs and score fields are not trusted.

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/health` | PostgreSQL-backed readiness and demo capability |
| POST | `/api/auth/register` | name, email, password → account/JWT |
| POST | `/api/auth/login` | email, password → JWT |
| GET | `/api/auth/me` | authenticated user |
| GET | `/api/hunts` | active hunt cards/player counts |
| GET | `/api/hunts/:id` | hunt metadata, not answers |
| POST | `/api/hunts/:id/join` | optional teamName, idempotent |
| GET | `/api/hunts/:id/progress` | own clue, score, completed locations |
| PATCH | `/api/players/location` | huntId, latitude, longitude, mode |
| POST | `/api/hunts/:id/check-location` | checkpointId; validates stored position |
| POST | `/api/hunts/:id/complete-checkpoint` | checkpointId; atomically validates and awards |
| POST | `/api/hunts/:id/hint` | checkpointId; deducts 20 once |
| GET | `/api/hunts/:id/leaderboard` | ranked progress, simulated labels |
| GET | `/api/hunts/:id/players` | joined player's view of recent positions |
| POST | `/api/demo/arrival` | own simulated arrival; local only |
| GET | `/api/demo/checkpoints/:id` | illustrative demo destinations; local only |
| POST | `/api/demo/reset` | own run only; local only |
| POST | `/api/demo/simulate` | advance one simulated opponent; organizer/local |
| POST | `/api/ai/generate-clue` | location/difficulty; organizer-only draft |

`difficulty` is currently accepted as contract context; the implemented prompt is university-level rather than a distinct difficulty algorithm. AI drafts are returned for organizer review and **are not automatically published into active hunts**.

## Location, score, live updates and AI

Haversine uses Earth radius 6,371,000 meters. Both check and completion compare the most recent stored position with the server's current checkpoint, within 80 meters. Locations older than five minutes are rejected. Completion rechecks distance inside its transaction rather than trusting a previous “reached” response. GPS is client-reported and can be spoofed; this is not cheat-proof.

Speed reward is `max(0, 50 - floor(secondsSincePreviousCompletion / 6))`, measured from join for the first checkpoint. Server time determines the reward. The sixth checkpoint adds 200. Leaderboard order is score, completed checkpoints, completion time, start time, then ID. Rank is current, not frozen at completion.

The game polls own progress, leaderboard and players every 2.5 seconds after the previous poll finishes; it aborts requests and clears its timeout on unmount. About 1.2 read requests/second/player is appropriate for a laptop, not a large public event. Mutations remain REST. No WebSockets/SSE/Redis/Kafka.

`POST /api/ai/generate-clue` calls the OpenAI Responses API only on the server with a 3.5-second timeout. Empty/blank keys, 401, 429, provider failures, network errors, malformed/answer-revealing output all return the stored clue labeled **Prepared clue**. The successful path returns **AI-generated draft**. No normal join or checkpoint request calls OpenAI. Valid-key live generation remains unverified without credentials. OAuth is intentionally not implemented because local email/password is the primary resume-matched path.

## Tests and screenshots

```powershell
npm test
npm run build
```

See [verification evidence](docs/VERIFICATION.md) for executed checks and limitations. The API test creates temporary test users, checks real SQL persistence and removes only its own test rows afterward. Use an isolated development database, never production. CI provisions PostgreSQL and repeats the API suite/build.

Screenshot suggestions: login, dashboard, live two-player game, completion. The browser-verified UI is available locally; no fabricated screenshots are presented as test evidence.

## Troubleshooting

| Problem | Fix |
|---|---|
| npm not found | Install Node 20+, reopen VS Code terminal, run `node --version` and `npm.cmd --version`. |
| PowerShell blocks npm.ps1 | Use `npm.cmd run demo`; avoid machine-wide execution policy changes. |
| npm run dev missing | Run inside `server` or `client`, not the root. Root command is `npm run demo`. |
| PostgreSQL connection refused | Run `npm run demo` to start the dedicated cluster. Existing service users: verify service, port and IPv4 host. |
| Password authentication failed | Correct `server/.env` locally. Use the matching role/database/port; do not overwrite the generated setup with example credentials. |
| Port already in use / EACCES | `npm run stop`; inspect `Get-NetTCPConnection -LocalPort 3001`. Windows reserved ranges: `netsh interface ipv4 show excludedportrange protocol=tcp`. |
| Vite cannot contact API | Start backend on 3001; Vite 3002 proxies `/api`. Check `/api/health`. |
| CORS errors | Prefer same-origin `/api`; for split hosting set `CLIENT_ORIGIN` to the exact frontend origin. |
| Leaflet blank | Use the offline schematic, check `/campus.svg`, reload after layout changes. Map CSS gives it an explicit height. |
| Location denied | Turn on Demo Location Mode, Simulate arrival, then Check location. Real GPS requires browser permission and HTTPS except localhost. |
| OpenAI key missing | Expected and supported. Prepared clues keep gameplay complete. |
| Table/database missing | Create `scavenger_hunt` then `npm run db:setup`; setup cannot create an arbitrary existing-service database without privileges. |
| Changed `.env` not picked up | Restart API; dotenv is read at process startup. |
| Token expired | Sign in again. Database progress is unaffected. |
| Offline package install fails | Dependencies must be installed once online; preserve node_modules for the interview. |

## How to Explain This Project in an Interview

“React renders a player's current clue and map. It sends authenticated JSON requests to Express. PostgreSQL owns the run, checkpoints, hints, locations and score. I lock the participant row while completing a checkpoint, so retries or double-clicks cannot earn points twice. Other players see changes through polling. Leaflet supplies the map interaction, and the bundled schematic works offline. Browser GPS and demo coordinates both reach the same Haversine validation. OpenAI is an optional organizer draft tool with stored fallback clues, so the game never depends on a provider response.”

I chose PostgreSQL for constraints, joins and transactions, Leaflet for an open map library, and REST/polling for a simple explainable laptop demo. JWT authenticates the caller; bcrypt hashes passwords. Major challenges were authoritative scoring, offline presentation, repeatable Windows startup and honest fallback behavior. Future work includes verified campus surveying, stronger location proof, production session handling, event-wide privacy controls and a scalable push layer.

Read [INTERVIEW_GUIDE.md](docs/INTERVIEW_GUIDE.md) for the real code path, 40 Q&As and JD-specific discussion; [CHEATSHEET.md](docs/CHEATSHEET.md) for the short rehearsal; [DEPLOYMENT.md](docs/DEPLOYMENT.md) for safe hosting and tunnel commands.
