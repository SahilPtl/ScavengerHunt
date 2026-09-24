# Optional Google login — feature/google-login

The same complete multiplayer demo remains available with email/password and no Google credentials. Google login requires internet and valid Google Cloud configuration; it is not an offline login replacement. This work is on a side branch; main is not changed.

## Local configuration

The supplied web-client JSON has been read locally and its client ID/secret placed in ignored `server/.env`. It is not committed, copied to the frontend, logged or returned by any API. Never commit the downloaded `client_secret*.json` file.

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

Set all three to enable Google sign-in. Blank/missing/incomplete settings hide the button and disable its flow endpoints. A production callback must use HTTPS. The local demo and password authentication keep working either way.

In Google Cloud Console, select the supplied client and add the exact callback above under **Authorized redirect URIs**, preserving existing entries. The supplied client initially registered only `http://localhost:15001/api/auth/google/callback`, which is a separate application. Google rejects unregistered callback URLs with `redirect_uri_mismatch`. Do not move Scavenger Hunt onto the other application's port.

The server redirect flow does not need a JavaScript origin entry. Request only `openid email profile`. If Google marks the app as Testing, the participating Google accounts may need to be listed as test users. Do not publish the consent screen or add broader API permissions merely to run this demo.

Start with `npm run demo`, open **http://localhost:3001/login**, then **Sign in with Google**. Even if you enter through 127.0.0.1 or Vite, the button starts at the configured callback origin so the browser's state cookie returns correctly. Localhost and 127.0.0.1 have separate session storage; use localhost consistently for Google testing. Existing demo credentials remain `demo@mnnit.com` / `demo123` and `player2@mnnit.com` / `demo123`.

## Actual implementation

- `server/google.js`: Google authorization-code flow, PKCE S256, random state and nonce, server token exchange with timeout, and Google library ID-token verification (signature, issuer, audience and expiration).
- State lives for ten minutes in PostgreSQL. Only its hash is stored; the initiating browser receives a matching HttpOnly SameSite=Lax cookie. Callback consumption deletes the attempt before exchange, preventing replay.
- New Google users are regular players. Their immutable Google `sub` identifies them; email must be verified. Existing password accounts are never automatically linked just because an email matches. Use the existing password for those accounts; explicit account linking is not implemented.
- `users.google_sub` is unique and nullable; `password_hash` is nullable for Google-only accounts. Additive migration preserves existing users, passwords and game progress. Password login safely rejects a Google-only account rather than throwing on a null hash.
- A successful callback creates a one-minute, one-use ticket in PostgreSQL and an HttpOnly cookie. It redirects to `/auth/google/complete` without any code, JWT or Google token in the destination URL. React exchanges the cookie through a same-origin POST for the usual game JWT and stores it in the existing per-tab sessionStorage.
- Provider cancellation, bad state, expired attempts, network failures and account conflicts return useful login messages. No raw provider responses or credentials are logged. Normal gameplay never depends on Google after login.
- No Google access/refresh tokens are persisted. No Gmail/Drive/Calendar permissions are requested. Google users can use local Demo Location Mode, join and complete the same hunt, and see the same leaderboard; organizer permissions are not granted automatically.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/google/config` | Public enabled flag and configured start URL; no secret |
| GET | `/api/auth/google` | Start browser-bound authorization |
| GET | `/api/auth/google/callback` | Verify/consume state, exchange code, validate identity |
| POST | `/api/auth/google/session` | Consume short-lived ticket and issue game JWT |

## Verification

`npm test` now runs 22 checks, covering the original real PostgreSQL multiplayer suite plus optional configuration, PKCE, cookie flags, missing/mismatched/Unicode state, expired/consumed attempts, cancellation, provider failure, nonce, verified-email requirement, account-collision rejection, persistent Google identity and one-use session tickets. Google transport is controlled in these integration tests; they are not evidence of a successful real Google account login.

The real browser displayed the Google button and reached Google's authorization server. Google returned **400 redirect_uri_mismatch** with the initial supplied client configuration. A live successful callback remains unverified until its Cloud Console callback is saved and a Google account completes sign-in. The rest of the app and local demo remain functional.

## Production and interview notes

Use your own production OAuth web client and exact HTTPS callback for the deployed domain. Avoid sharing one development client between unrelated production apps. Keep the client secret in the host secret manager. Public-mode demo controls/accounts stay disabled; Google users never bypass those checks. Existing JWT sessionStorage tradeoffs remain as described in the deployment guide.

Say: “Google proves the user's identity through OpenID Connect. I verify its signed ID token on the server, then issue my application's JWT. State binds the response to the browser, PKCE binds the authorization code to its initiating flow, and nonce protects the ID-token exchange. The game state still lives in PostgreSQL.”

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
