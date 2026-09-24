# Verification record

Executed on 25 September 2026 (Asia/Kolkata), Windows, Node 20.16.0 and PostgreSQL 17. Real project-local PostgreSQL used SCRAM authentication on `127.0.0.1:55432`. No OAuth settings or OpenAI key were present for the complete demo.

## Executed successfully

- Client/server npm installs and lockfiles. Backend audit: zero vulnerabilities; client upgraded to React Router 7.18.4 after an advisory, then zero vulnerabilities.
- Idempotent schema and prepared clue seeds applied repeatedly without destroying real progress.
- Root `npm run demo` initialized DB state, built React, started API and served the real UI at port 3001.
- `npm test`: **12 passing checks**, including nine nested real PostgreSQL/HTTP lifecycle checks; no skipped tests.
- Authentication, bcrypt hashing, duplicate email, invalid login/JWT and unauthenticated rejection.
- Two independently authenticated players; idempotent joins; missing hunt; invalid coordinates; wrong checkpoint order; too-distant coordinates.
- Supplied other-user IDs did not change the second user's run/location; non-organizers could not draft clues or simulate opponents.
- Five concurrent hint requests deducted 20 only once. Eight concurrent completion requests produced exactly one reward.
- All six checkpoints, final completion bonus, duplicate final completion, score equal to summed completion rewards minus hint cost.
- Fresh login preserved completed progress; reset changed only the current user.
- Haversine same-point, symmetry and known equatorial distance checks.
- Prepared clue fallback for blank/missing key, mocked 401, 429 and 500 provider responses, network rejection and timeout. Successful provider response parsing tested with a stub; **live valid-key OpenAI generation was not verified**.
- Two real browser sessions logged in as Explorer One and Explorer Two and joined hunt 1. Both completed a checkpoint through UI controls and API/database mutations.
- Explorer Two's leaderboard visibly received Explorer One's checkpoint and score. Explorer One refreshed and retained progress; it saw Explorer Two's independent score.
- Browser geolocation was unavailable/denied; the UI showed the message and switched to Demo Location Mode.
- Explorer One completed six checkpoints via Simulate arrival / Check location. Completion displayed 1,071 points, 6/6, rank 1 and 00:01:00 for that timed run; Explorer Two showed the same finished result. Scores vary with time.
- UI hint deducted 20. UI reset returned Explorer One to zero points/first clue while Explorer Two remained at one checkpoint/148 points.
- Organizer UI without a key returned stored text explicitly labeled Prepared clue.
- Leaflet rendered the bundled schematic and markers with no tile-provider dependency.
- Both exact `npm run dev` commands were executed from their package folders: nodemon API on 3001, Vite on 3002, and the Vite `/api/health` proxy passed.
- The setup script ran successfully with `server/.env` temporarily absent and the private PostgreSQL URL supplied through environment memory; the file was restored immediately. OpenAI remained blank.
- Public build and local production-mode server on 3003 were checked: health reported demo=false, seeded demo login returned 401, authenticated demo reset/arrival/simulate/checkpoint routes returned 403, non-organizer AI draft returned 403, and browser JavaScript contained neither the demo email nor password.
- `npm run stop` stopped the recorded project API and its dedicated PostgreSQL cluster without changing installed services. The dedicated cluster was restarted and served the subsequent development/API tests.
- Final `npm run db:reset` safely cleared seeded runs, then `npm run stop` followed by `npm run demo` restarted PostgreSQL from stopped state, re-seeded, rebuilt and passed readiness. The delivered app was left running for rehearsal.

## Problems caught and fixed

- Bundled Git needed its HTTPS helper directory configured for clone/push.
- Windows reserved port ranges included 5000 and 5173; defaults changed to 3001 and 3002.
- Node 20 on Windows did not expand the test glob; test script now names the test file explicitly.
- React Router dependency advisory fixed by updating to 7.18.4.

## Boundaries

No live valid-key OpenAI call, OAuth integration, WSL runtime, surveyed campus navigation or public production deployment is claimed. Cloudflared was absent, so public tunnel execution remains unverified. The OpenAI provider failure tests use controlled fake transport responses, not a real paid provider outage. No physical GPS walk was performed. Browser fallback behavior was real; exact provider permission-denial versus unavailable-location cause is not distinguished by the friendly UI message.

The app uses an original offline schematic by default, so offline map rendering does not depend on downloading tiles. Dependencies must first be installed online. Screenshots are visual inspection aids, not replacements for the executed database/API/browser checks.
