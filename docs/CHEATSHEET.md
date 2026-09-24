# MNNIT Campus Hunt — one-page rehearsal

**Open:** `code 'C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt'`

**Root:** `C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt`

**Start tomorrow:** `npm run demo` → **http://127.0.0.1:3001**. Database already configured: PostgreSQL 17, `scavenger_hunt`, `hunt_app`, `127.0.0.1:55432`, `.local/postgres`. Keep `server/.env` private. No OpenAI/OAuth keys required.

**Two logins:** `demo@mnnit.com` / `demo123`; `player2@mnnit.com` / `demo123`. Use independently created tabs or two browsers. Do not duplicate a logged-in tab.

**Five-minute path:** Both log in → both Start / resume hunt → read Prepared clue → turn on Demo Location Mode → Simulate arrival → Check location → show score/next clue → second tab shows leaderboard change → second player completes a point → refresh first tab → re-enable demo mode → use hint → finish six → completion/time/rank → Reset my run → Confirm reset. Second player stays unchanged.

**Say:** “React renders, Express validates, PostgreSQL owns state. Row locks and unique completion keys prevent duplicate points. Polling shares changes every 2.5 seconds. Leaflet's local schematic works offline. OpenAI is an optional organizer draft with prepared fallback. GPS is client-reported, so it is not cheat-proof. This is an honestly dated rebuild.”

**Trace:** `client/src/pages/GamePage.jsx` → `client/src/services/api.js` → `server/auth.js` → `server/routes.js` → `server/services/game.js` → PostgreSQL → `client/src/hooks/useHunt.js` → `Leaderboard.jsx`.

**Key routes:** `POST /api/auth/login`; `POST /api/hunts/1/join`; `PATCH /api/players/location`; `POST /api/hunts/1/complete-checkpoint`; `GET /api/hunts/1/leaderboard`; `POST /api/demo/reset` (own run/local only).

**Score:** 100 + up to 50 speed points; hint −20 once; final +200. **Math:** Haversine, R=6,371,000m, radius 80m. **SQL:** participant lock, insert completion, update score, COMMIT. **JWT:** signed, not encrypted; 8h; per-tab sessionStorage. **Map:** original schematic; all checkpoint coordinates illustrative.

**Commands:** `npm test` (real DB/API); `npm run build`; `npm run stop` (API + dedicated DB); `npm run db:reset` then `npm run db:setup` (seeded runs only, DB must be running). In-app reset is easiest.

**Dev terminals:** `cd server; npm run dev` (3001), `cd client; npm run dev` (3002). Run from separate terminals after stopping the demo API. **Health:** `/api/health`.

**Recovery:** Keep installed dependencies and `.local` intact; use offline schematic + demo mode + prepared clues. No Wi-Fi required after installation. Database error → check 55432 and `.env`; occupied port → stop/restart; expired token → login; GPS denied → demo switch. Ports 5000/5173 are reserved on this laptop.

**Limits to disclose:** no verified live OpenAI success, no OAuth, illustrative geography, no anti-cheat, no public production deployment. Public mode disables seeded accounts and demo routes. Full details: `docs/INTERVIEW_GUIDE.md`, `docs/DEPLOYMENT.md`, `docs/VERIFICATION.md`.
