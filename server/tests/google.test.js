import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createHash } from "node:crypto";
import { createGoogleRouter } from "../google.js";
import { googleSettings } from "../config.js";
import { pool } from "../database/db.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import authRoutes from "../auth.js";
import gameRoutes from "../routes.js";

test("OAuth config requires all settings and secure production callback", () => {
  const sample = {
    GOOGLE_CLIENT_ID: "test-id",
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:3001/api/auth/google/callback",
  };
  assert.equal(googleSettings({}), null);
  assert.equal(googleSettings({ ...sample, GOOGLE_CLIENT_SECRET: " " }), null);
  assert.equal(
    googleSettings({
      ...sample,
      GOOGLE_CALLBACK_URL: "https://example.test/wrong",
    }),
    null,
  );
  assert.equal(googleSettings({ ...sample, NODE_ENV: "production" }), null);
  assert.ok(googleSettings(sample));
  assert.ok(
    googleSettings({
      ...sample,
      NODE_ENV: "production",
      GOOGLE_CALLBACK_URL: "https://example.test/api/auth/google/callback",
    }),
  );
});

test("Google routes: state, PKCE, verified identity, one-use session and failure isolation", async (t) => {
  const prefix = "google-test-" + Date.now(),
    email = prefix + "@example.test";
  let behavior = "success",
    calls = 0;
  const settings = {
    clientId: "test-client",
    clientSecret: "not-a-real-secret",
    origin: "",
    callback: "",
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth/google",
    createGoogleRouter({
      settings,
      exchange: async (code, attempt) => {
        calls++;
        if (behavior === "network") throw Error("provider failure");
        return {
          sub: prefix,
          nonce: behavior === "nonce" ? "wrong" : attempt.nonce,
          email_verified: behavior !== "unverified",
          email: behavior === "collision" ? "demo@mnnit.com" : email,
          name: "Google test explorer",
        };
      },
    }),
  );
  app.use("/disabled", createGoogleRouter({ settings: null }));
  app.use("/api/auth", authRoutes);
  app.use("/api", gameRoutes);
  app.use((e, req, res, next) =>
    res.status(e.status || 503).json({ success: false, message: e.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  settings.origin = "http://127.0.0.1:" + server.address().port;
  settings.callback = settings.origin + "/api/auth/google/callback";
  const call = (path, options = {}) =>
    fetch(settings.origin + path, { redirect: "manual", ...options });
  const begin = async () => {
    const r = await call("/api/auth/google");
    const url = new URL(r.headers.get("location"));
    return {
      r,
      url,
      state: url.searchParams.get("state"),
      cookie: r.headers.get("set-cookie").split(";")[0],
    };
  };
  const finish = (attempt, query = "code=test-code") =>
    call(
      "/api/auth/google/callback?state=" +
        encodeURIComponent(attempt.state) +
        "&" +
        query,
      { headers: { Cookie: attempt.cookie } },
    );
  const redeem = (cookie) =>
    call("/api/auth/google/session", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: "{}",
    });
  try {
    await t.test(
      "missing config hides login and disables endpoints",
      async () => {
        assert.equal(
          (await (await call("/disabled/config")).json()).data.enabled,
          false,
        );
        assert.equal((await call("/disabled")).status, 404);
      },
    );
    await t.test(
      "start contains minimal scopes, nonce and S256 PKCE, HttpOnly SameSite cookie",
      async () => {
        const a = await begin();
        assert.equal(a.r.status, 302);
        assert.equal(a.url.origin, "https://accounts.google.com");
        assert.equal(a.url.searchParams.get("scope"), "openid email profile");
        assert.equal(a.url.searchParams.get("code_challenge_method"), "S256");
        assert.ok(a.r.headers.get("set-cookie").includes("HttpOnly"));
        assert.ok(a.r.headers.get("set-cookie").includes("SameSite=Lax"));
        const entry = (
          await pool.query("SELECT * FROM oauth_attempts WHERE state_hash=$1", [
            createHash("sha256").update(a.state).digest("hex"),
          ])
        ).rows[0];
        assert.equal(
          a.url.searchParams.get("code_challenge"),
          createHash("sha256").update(entry.verifier).digest("base64url"),
        );
        assert.equal(a.url.searchParams.get("nonce"), entry.nonce);
        await finish(a, "error=access_denied");
      },
    );
    await t.test(
      "missing/mismatched/unicode state never exchanges a code",
      async () => {
        const before = calls;
        const a = await begin();
        const bad = await finish({ ...a, state: "é".repeat(43) });
        assert.ok(bad.headers.get("location").endsWith("google_error=expired"));
        const noCookie = await call(
          "/api/auth/google/callback?state=" + a.state + "&code=test",
        );
        assert.ok(
          noCookie.headers.get("location").endsWith("google_error=expired"),
        );
        assert.equal(calls, before);
        await finish(a, "error=access_denied");
      },
    );
    await t.test(
      "denial and consumed/expired attempts return friendly login errors",
      async () => {
        const a = await begin();
        assert.ok(
          (await finish(a, "error=access_denied")).headers
            .get("location")
            .endsWith("google_error=cancelled"),
        );
        assert.ok(
          (await finish(a)).headers
            .get("location")
            .endsWith("google_error=expired"),
        );
        const b = await begin();
        await pool.query(
          "UPDATE oauth_attempts SET expires_at=now()-interval '1 second' WHERE state_hash=$1",
          [createHash("sha256").update(b.state).digest("hex")],
        );
        assert.ok(
          (await finish(b)).headers
            .get("location")
            .endsWith("google_error=expired"),
        );
      },
    );
    await t.test(
      "provider failure, bad nonce and unverified email create no account",
      async () => {
        for (const mode of ["network", "nonce", "unverified"]) {
          behavior = mode;
          assert.ok(
            (await finish(await begin())).headers
              .get("location")
              .endsWith("google_error=failed"),
          );
        }
        assert.equal(
          (
            await pool.query("SELECT 1 FROM users WHERE google_sub=$1", [
              prefix,
            ])
          ).rowCount,
          0,
        );
      },
    );
    await t.test(
      "existing password account is never silently linked",
      async () => {
        behavior = "collision";
        assert.ok(
          (await finish(await begin())).headers
            .get("location")
            .endsWith("google_error=existing_account"),
        );
        assert.equal(
          (
            await pool.query(
              "SELECT google_sub FROM users WHERE email='demo@mnnit.com'",
            )
          ).rows[0].google_sub,
          null,
        );
      },
    );
    await t.test(
      "success persists player; code and browser ticket are one-use; JWT never in redirect",
      async () => {
        behavior = "success";
        const a = await begin(),
          r = await finish(a);
        assert.equal(
          r.headers.get("location"),
          settings.origin + "/auth/google/complete",
        );
        const ticket = r.headers
          .getSetCookie()
          .find((x) => x.startsWith("hunt_google_ticket="))
          .split(";")[0];
        const result = await (await redeem(ticket)).json();
        assert.equal(result.success, true);
        assert.equal(result.data.user.role, "player");
        const gamePost = (path, body) =>
          call(path, {
            method: "POST",
            headers: {
              Authorization: "Bearer " + result.data.token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
        assert.equal((await gamePost("/api/hunts/1/join", {})).status, 200);
        assert.equal(
          (await gamePost("/api/demo/arrival", { huntId: 1 })).status,
          200,
        );
        assert.equal(
          (
            await gamePost("/api/hunts/1/complete-checkpoint", {
              checkpointId: 1,
            })
          ).status,
          200,
        );
        assert.equal((await gamePost("/api/demo/simulate", {})).status, 403);
        assert.equal(
          (
            await call("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password: "unusable123" }),
            })
          ).status,
          401,
        );
        assert.equal(
          jwt.verify(result.data.token, config.secret).sub,
          String(result.data.user.id),
        );
        assert.equal((await redeem(ticket)).status, 401);
        assert.ok(
          (await finish(a)).headers
            .get("location")
            .endsWith("google_error=expired"),
        );
        const user = (
          await pool.query("SELECT * FROM users WHERE google_sub=$1", [prefix])
        ).rows[0];
        assert.equal(user.password_hash, null);
        assert.equal(user.demo_account, false);
        const second = await finish(await begin());
        assert.equal(second.status, 302);
        assert.equal(
          (
            await pool.query("SELECT 1 FROM users WHERE google_sub=$1", [
              prefix,
            ])
          ).rowCount,
          1,
        );
      },
    );
  } finally {
    await pool.query(
      "DELETE FROM hunt_participants WHERE user_id IN (SELECT id FROM users WHERE google_sub=$1)",
      [prefix],
    );
    await pool.query("DELETE FROM users WHERE google_sub=$1", [prefix]);
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
