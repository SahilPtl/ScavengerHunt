import { Router } from "express";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { pool } from "./database/db.js";
import { config, google } from "./config.js";
import { session } from "./session.js";
import { fail, ok, wrap } from "./utils.js";

const random = () => randomBytes(32).toString("base64url");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function cookie(req, name) {
  const value = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value || "") ? value : null;
}
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function exchangeGoogleCode(code, attempt, settings) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.callback,
      grant_type: "authorization_code",
      code_verifier: attempt.verifier,
    }),
  });
  if (!response.ok) throw Error("Google exchange failed");
  const tokens = await response.json();
  const verifier = new OAuth2Client({
    clientId: settings.clientId,
    transporterOptions: { timeout: 8000, retry: false },
  });
  const ticket = await verifier.verifyIdToken({
    idToken: tokens.id_token,
    audience: settings.clientId,
  });
  return ticket.getPayload();
}

export function createGoogleRouter({
  settings = google,
  exchange = exchangeGoogleCode,
  db = pool,
} = {}) {
  const router = Router();
  router.get("/config", (req, res) =>
    ok(res, {
      enabled: !!settings,
      startUrl: settings ? settings.origin + "/api/auth/google" : null,
    }),
  );
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!settings)
      return next(
        fail(404, "Google sign-in is not configured. Use email/password."),
      );
    next();
  });
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: settings?.origin.startsWith("https:"),
    path: "/api/auth/google",
  };
  const clear = (res, name) => res.clearCookie(name, options);
  const errorRedirect = (res, code) =>
    res.redirect(settings.origin + "/login?google_error=" + code);

  router.get(
    "/",
    wrap(async (req, res) => {
      // Always start on the configured callback host so the state cookie returns.
      if (req.headers.host !== new URL(settings.origin).host)
        return res.redirect(settings.origin + "/api/auth/google");
      const state = random(),
        nonce = random(),
        verifier = random();
      await db.query("DELETE FROM oauth_attempts WHERE expires_at<now()");
      await db.query("DELETE FROM oauth_tickets WHERE expires_at<now()");
      await db.query(
        "INSERT INTO oauth_attempts(state_hash,nonce,verifier) VALUES($1,$2,$3)",
        [hash(state), nonce, verifier],
      );
      res.cookie("hunt_google_state", state, { ...options, maxAge: 600000 });
      const query = new URLSearchParams({
        client_id: settings.clientId,
        redirect_uri: settings.callback,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        prompt: "select_account",
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
      });
      res.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + query);
    }),
  );
  router.get("/callback", async (req, res) => {
    clear(res, "hunt_google_state");
    if (!same(req.query.state, cookie(req, "hunt_google_state")))
      return errorRedirect(res, "expired");
    try {
      const {
        rows: [attempt],
      } = await db.query(
        "DELETE FROM oauth_attempts WHERE state_hash=$1 AND expires_at>now() RETURNING *",
        [hash(req.query.state)],
      );
      if (!attempt) return errorRedirect(res, "expired");
      if (req.query.error) return errorRedirect(res, "cancelled");
      if (typeof req.query.code !== "string" || req.query.code.length > 4096)
        return errorRedirect(res, "failed");
      const identity = await exchange(req.query.code, attempt, settings);
      if (
        !identity ||
        !same(identity.nonce, attempt.nonce) ||
        identity.email_verified !== true ||
        typeof identity.sub !== "string" ||
        !identity.sub ||
        identity.sub.length > 255 ||
        typeof identity.email !== "string" ||
        identity.email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(identity.email)
      )
        return errorRedirect(res, "failed");
      const email = identity.email.toLowerCase();
      let user = (
        await db.query("SELECT * FROM users WHERE google_sub=$1", [
          identity.sub,
        ])
      ).rows[0];
      if (!user) {
        // Email alone never grants access to an existing password account.
        const name =
          (typeof identity.name === "string"
            ? identity.name
            : "Google explorer"
          )
            .trim()
            .slice(0, 60) || "Google explorer";
        user = (
          await db.query(
            "INSERT INTO users(name,email,password_hash,google_sub) VALUES($1,$2,NULL,$3) ON CONFLICT DO NOTHING RETURNING *",
            [name, email, identity.sub],
          )
        ).rows[0];
        if (!user)
          user = (
            await db.query("SELECT * FROM users WHERE google_sub=$1", [
              identity.sub,
            ])
          ).rows[0];
        if (!user) return errorRedirect(res, "existing_account");
      }
      if (user.simulated || (!config.demo && user.demo_account))
        return errorRedirect(res, "failed");
      const ticket = random();
      await db.query(
        "INSERT INTO oauth_tickets(ticket_hash,user_id) VALUES($1,$2)",
        [hash(ticket), user.id],
      );
      res.cookie("hunt_google_ticket", ticket, { ...options, maxAge: 60000 });
      res.redirect(settings.origin + "/auth/google/complete");
    } catch {
      // Never expose provider responses, codes, tokens or personal data in logs/URLs.
      errorRedirect(res, "failed");
    }
  });
  router.post(
    "/session",
    wrap(async (req, res) => {
      const ticket = cookie(req, "hunt_google_ticket");
      clear(res, "hunt_google_ticket");
      if (!ticket) throw fail(401, "Google sign-in expired. Please try again.");
      const {
        rows: [entry],
      } = await db.query(
        "DELETE FROM oauth_tickets WHERE ticket_hash=$1 AND expires_at>now() RETURNING user_id",
        [hash(ticket)],
      );
      if (!entry) throw fail(401, "Google sign-in expired. Please try again.");
      const user = (
        await db.query(
          "SELECT id,name,role,simulated,demo_account FROM users WHERE id=$1",
          [entry.user_id],
        )
      ).rows[0];
      if (!user || user.simulated || (!config.demo && user.demo_account))
        throw fail(401, "Account unavailable");
      ok(res, session(user));
    }),
  );
  return router;
}
