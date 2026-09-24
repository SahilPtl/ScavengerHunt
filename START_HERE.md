# Start the interview demo on this laptop

## Tomorrow in VS Code

1. Open **File → Open Folder** and select `C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt`.
2. Open **Terminal → New Terminal** (PowerShell).
3. Run:

```powershell
cd 'C:\Users\sahil\OneDrive\Documents\Projects\ScavengerHunt'
npm run demo
```

4. Wait for **READY**, then open **http://localhost:3001** in your browser. Keep the terminal running.
5. Choose **Sign in with Google** (internet required), or use `demo@mnnit.com` / `demo123` for the local organizer demo. A second player can use `player2@mnnit.com` / `demo123` in an independently opened tab or browser.
6. Start/resume the hunt, turn on **Demo Location Mode**, click **Simulate arrival**, then **Check location**. Show the leaderboard and refresh to demonstrate saved progress.

The database, credentials and dependencies are already configured in this existing folder. The startup command starts the project PostgreSQL cluster, applies the schema/seeds without resetting player progress, builds React, and starts the API/UI. No separate PostgreSQL, frontend or backend terminal is needed for this walkthrough. Google login is included in `main`.

## Stop or recover

- To stop everything, run `npm run stop` from another terminal in the same folder. Closing the demo with Ctrl+C stops the API; the database can remain running until `npm run stop`.
- If startup says port 3001 is already serving HTTP, run `npm run stop`, then `npm run demo` again. This handles the project server, not unrelated applications using that port.
- If PowerShell blocks `npm.ps1`, use `npm.cmd run demo` (and `npm.cmd run stop`).
- If `npm` is not recognized, restart VS Code so its terminal picks up the installed Node.js PATH.
- If Google cannot connect, check internet access and use **http://localhost:3001**. The email/password demo works without Google or an OpenAI key.
- Use **Reset my run** only when you want to restart your current player's hunt. It does not reset other players.

Keep `server/.env` and `.local/postgres` in place. Do not copy `.env.example` over your configured `.env`. Credentials are intentionally excluded from Git: a new clone on another laptop requires setup, unlike reopening this existing folder.

Google currently shows the shared project's consent-screen name **sql playground 1**. The local hunt still uses the configured ScavengerHunt callback.
