import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../app.js";
import { pool } from "../database/db.js";
import { generateClue } from "../services/clues.js";
import { distance } from "../utils.js";

test("Haversine: same point, symmetry, known equatorial degree", () => {
  assert.equal(
    distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }),
    0,
  );
  assert.ok(
    Math.abs(
      distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) -
        111195,
    ) < 2,
  );
  assert.equal(
    distance({ latitude: 25, longitude: 81 }, { latitude: 26, longitude: 82 }),
    distance({ latitude: 26, longitude: 82 }, { latitude: 25, longitude: 81 }),
  );
});
test("Prepared clue survives missing, blank, invalid, rate-limited, network and timed-out OpenAI requests", async () => {
  const c = { name: "Central Library", clue: "Prepared library clue" };
  const fallback = { clue: c.clue, source: "Prepared clue" };
  for (const key of ["", "   "])
    assert.deepEqual(
      await generateClue(c, {
        key,
        fetcher: () => {
          throw Error("must not call");
        },
      }),
      fallback,
    );
  for (const status of [401, 429, 500])
    assert.deepEqual(
      await generateClue(c, {
        key: "invalid-test-key",
        fetcher: async () => new Response("{}", { status }),
      }),
      fallback,
    );
  assert.deepEqual(
    await generateClue(c, {
      key: "invalid-test-key",
      fetcher: async () => {
        throw Error("offline");
      },
    }),
    fallback,
  );
  assert.deepEqual(
    await generateClue(c, {
      key: "invalid-test-key",
      timeout: 20,
      fetcher: (_url, { signal }) =>
        new Promise((resolve, reject) => {
          const hold = setTimeout(resolve, 100);
          signal.addEventListener("abort", () => {
            clearTimeout(hold);
            reject(signal.reason);
          });
        }),
    }),
    fallback,
  );
  assert.equal(
    (
      await generateClue(c, {
        key: "test",
        fetcher: async () =>
          new Response(
            JSON.stringify({
              output: [
                {
                  content: [
                    {
                      type: "output_text",
                      text: "Silent shelves hold a thousand voices.",
                    },
                  ],
                },
              ],
            }),
          ),
      })
    ).source,
    "AI-generated draft",
  );
});
test("Real PostgreSQL and HTTP lifecycle, authorization, concurrency, persistence and reset", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const emails = [];
  const call = async (path, { token, method = "GET", body } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, ...(await response.json()) };
  };
  const post = (path, token, body = {}) =>
    call(path, { token, method: "POST", body });
  try {
    await t.test("health, unauthenticated and malformed JWT", async () => {
      assert.equal((await call("/health")).status, 200);
      assert.equal((await call("/hunts")).status, 401);
      assert.equal((await call("/hunts", { token: "bad" })).status, 401);
    });
    const accounts = [];
    for (let i = 0; i < 2; i++) {
      const email = `verification-${Date.now()}-${i}@example.test`;
      emails.push(email);
      const r = await post("/auth/register", null, {
        name: `Verification ${i + 1}`,
        email,
        password: "Verify123!",
      });
      assert.equal(r.status, 201);
      accounts.push(r.data);
    }
    const [a, b] = accounts;
    await t.test(
      "registration, bcrypt login, duplicate email and bad credentials",
      async () => {
        assert.equal(
          (
            await post("/auth/register", null, {
              name: "Duplicate",
              email: emails[0],
              password: "Verify123!",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await post("/auth/login", null, {
              email: emails[0],
              password: "wrong-password",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await post("/auth/login", null, {
              email: emails[0],
              password: "Verify123!",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await pool.query("SELECT password_hash FROM users WHERE email=$1", [
              emails[0],
            ])
          ).rows[0].password_hash.startsWith("$2"),
          true,
        );
      },
    );
    await t.test(
      "join is idempotent and missing hunt returns 404",
      async () => {
        assert.equal((await post("/hunts/999999/join", a.token)).status, 404);
        for (const x of accounts)
          assert.equal(
            (await post("/hunts/1/join", x.token, { teamName: x.user.name }))
              .status,
            200,
          );
        await post("/hunts/1/join", a.token);
        assert.equal(
          (
            await pool.query(
              "SELECT count(*) FROM hunt_participants WHERE user_id=$1",
              [a.user.id],
            )
          ).rows[0].count,
          "1",
        );
      },
    );
    await t.test(
      "destination hidden, invalid coordinates and order rejected",
      async () => {
        const p = (await call("/hunts/1/progress", { token: a.token })).data;
        assert.equal(p.clue.source, "Prepared clue");
        assert.equal(p.clue.latitude, undefined);
        assert.equal(p.clue.name, undefined);
        assert.equal(
          (
            await call("/players/location", {
              token: a.token,
              method: "PATCH",
              body: { huntId: 1, latitude: 999, longitude: 1 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await post("/hunts/1/complete-checkpoint", a.token, {
              checkpointId: 2,
            })
          ).status,
          409,
        );
        await call("/players/location", {
          token: a.token,
          method: "PATCH",
          body: { huntId: 1, latitude: 0, longitude: 0 },
        });
        assert.equal(
          (await post("/hunts/1/check-location", a.token, { checkpointId: 1 }))
            .status,
          422,
        );
      },
    );
    await t.test(
      "wrong-user fields cannot modify another participant; organizer protected",
      async () => {
        await post("/demo/arrival", a.token, { huntId: 1, userId: b.user.id });
        const p = (await call("/hunts/1/progress", { token: b.token })).data;
        assert.equal(p.location, null);
        assert.equal(
          (
            await post("/ai/generate-clue", b.token, {
              location: "Central Library",
            })
          ).status,
          403,
        );
        assert.equal((await post("/demo/simulate", b.token)).status, 403);
      },
    );
    await t.test(
      "concurrent hints charge once; concurrent completion awards once",
      async () => {
        await Promise.all(
          Array.from({ length: 5 }, () =>
            post("/hunts/1/hint", a.token, { checkpointId: 1 }),
          ),
        );
        assert.equal(
          (await call("/hunts/1/progress", { token: a.token })).data.score,
          -20,
        );
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            post("/hunts/1/complete-checkpoint", a.token, {
              checkpointId: 1,
              score: 99999,
            }),
          ),
        );
        assert.ok(results.every((r) => r.status === 200));
        assert.equal(results.filter((r) => !r.data.alreadyCompleted).length, 1);
        const p = (await call("/hunts/1/progress", { token: a.token })).data;
        assert.equal(p.completed.length, 1);
        assert.equal(p.score, p.completed[0].points_awarded - 20);
      },
    );
    await t.test(
      "second real player sees changed leaderboard and independent progress",
      async () => {
        const board = (await call("/hunts/1/leaderboard", { token: b.token }))
          .data;
        assert.equal(board.find((x) => x.user_id === a.user.id).completed, 1);
        assert.equal(board.find((x) => x.user_id === b.user.id).completed, 0);
        assert.ok(
          (await call("/hunts/1/players", { token: b.token })).data.some(
            (x) => x.user_id === a.user.id,
          ),
        );
      },
    );
    await t.test(
      "all six checkpoints, final bonus, duplicate final and database score consistency",
      async () => {
        for (let i = 2; i <= 6; i++) {
          await post("/demo/arrival", a.token, { huntId: 1 });
          assert.equal(
            (
              await post("/hunts/1/complete-checkpoint", a.token, {
                checkpointId: i,
              })
            ).status,
            200,
          );
        }
        const p = (await call("/hunts/1/progress", { token: a.token })).data;
        assert.ok(p.completed_at);
        assert.equal(p.clue, null);
        assert.equal(p.completed.length, 6);
        assert.equal(
          p.score,
          p.completed.reduce((n, c) => n + c.points_awarded, 0) - 20,
        );
        assert.ok(p.completed[5].points_awarded >= 300);
        await post("/hunts/1/complete-checkpoint", a.token, {
          checkpointId: 6,
        });
        assert.equal(
          (await call("/hunts/1/progress", { token: a.token })).data.score,
          p.score,
        );
      },
    );
    await t.test(
      "fresh login preserves progress; reset is scoped to current user",
      async () => {
        const login = await post("/auth/login", null, {
          email: emails[0],
          password: "Verify123!",
        });
        assert.equal(
          (await call("/hunts/1/progress", { token: login.data.token })).data
            .completed.length,
          6,
        );
        await post("/demo/arrival", b.token, { huntId: 1 });
        await post("/hunts/1/complete-checkpoint", b.token, {
          checkpointId: 1,
        });
        await post("/demo/reset", a.token, { huntId: 1, userId: b.user.id });
        const p = (await call("/hunts/1/progress", { token: a.token })).data;
        assert.equal(p.score, 0);
        assert.equal(p.completed.length, 0);
        assert.equal(p.location, null);
        assert.equal(p.current_checkpoint, 1);
        assert.equal(
          (await call("/hunts/1/progress", { token: b.token })).data.completed
            .length,
          1,
        );
      },
    );
  } finally {
    await pool.query(
      "DELETE FROM hunt_participants WHERE user_id IN (SELECT id FROM users WHERE email=ANY($1))",
      [emails],
    );
    await pool.query("DELETE FROM users WHERE email=ANY($1)", [emails]);
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
