import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  MapPin,
  LocateFixed,
  RotateCcw,
  Check,
  Flag,
  Trophy,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useHunt } from "../hooks/useHunt";
import Timer from "../components/Timer";
import GameMap from "../components/GameMap";
import Leaderboard from "../components/Leaderboard";
export default function GamePage() {
  const { id } = useParams(),
    { demo, user } = useAuth(),
    { progress: p, rows, players, error, synced, refresh } = useHunt(id);
  const [demoMode, setDemoMode] = useState(false),
    [checkpoints, setCheckpoints] = useState([]),
    [message, setMessage] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false),
    [gps, setGps] = useState(false),
    [resetAsk, setResetAsk] = useState(false),
    [draft, setDraft] = useState(null);
  useEffect(() => {
    if (!demoMode) {
      setCheckpoints([]);
      return;
    }
    api("/demo/checkpoints/" + id)
      .then(setCheckpoints)
      .catch((e) => setActionError(e.message));
  }, [demoMode, id]);
  useEffect(() => {
    if (!gps || demoMode) return;
    if (!navigator.geolocation) {
      setActionError("Geolocation unavailable. Use Demo Location Mode.");
      setGps(false);
      return;
    }
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - last < 4000) return;
        last = Date.now();
        api("/players/location", {
          method: "PATCH",
          body: {
            huntId: Number(id),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            mode: "gps",
          },
        })
          .then(() => refresh())
          .catch((e) => setActionError(e.message));
      },
      () => {
        setActionError(
          demo
            ? "Location permission denied or unavailable. Demo Location Mode is ready."
            : "Location permission denied. Enable permission in browser settings.",
        );
        setGps(false);
        if (demo) setDemoMode(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [gps, demoMode, id, demo, refresh]);
  async function action(work) {
    setBusy(true);
    setActionError("");
    setMessage("");
    try {
      await work();
      await refresh();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const post = (url, body) => api(url, { method: "POST", body });
  if (!p)
    return (
      <main className="page">
        <Link to="/">← Back to hunts</Link>
        <p className={error ? "error" : ""}>
          {error || "Opening your field notes…"}
        </p>
      </main>
    );
  const rank = rows.findIndex((r) => r.user_id === user.id) + 1;
  return (
    <main className="page game">
      <Link className="back" to="/">
        <ArrowLeft size={15} /> All hunts
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="eyebrow">THE SIGNATURE HUNT / MEDIUM</span>
          <h1>MNNIT Campus Challenge</h1>
          <p className="muted">
            {p.team_name} ·{" "}
            {p.completed_at
              ? "Every clue, a discovery. You made it."
              : "The next discovery is closer than you think."}
          </p>
        </div>
        <div className="stat-strip">
          <div>
            <small>YOUR SCORE</small>
            <strong>
              {p.score}
              <em> pts</em>
            </strong>
          </div>
          <div>
            <small>ELAPSED TIME</small>
            <strong className="timer">
              <Timer start={p.started_at} end={p.completed_at} />
            </strong>
          </div>
          <div>
            <small>YOUR RANK</small>
            <strong>#{rank || "—"}</strong>
          </div>
        </div>
      </div>
      {p.completed_at && (
        <section className="completion card">
          <Trophy size={38} />
          <div>
            <span className="eyebrow">TRAIL COMPLETE</span>
            <h2>Six discoveries. One great adventure.</h2>
            <p>
              Hunt completed! {p.score} points · {p.completed.length}/6
              checkpoints · Current rank #{rank} ·{" "}
              <Timer start={p.started_at} end={p.completed_at} />
            </p>
          </div>
          <Link className="secondary" to="/leaderboard">
            View leaderboard <ArrowRight size={16} />
          </Link>
        </section>
      )}
      <div className="game-grid">
        <aside className="clue-column">
          <section className="card clue-card">
            <div className="clue-top">
              <span className="eyebrow">YOUR NEXT DISCOVERY</span>
              <span className="clue-number">
                {String(Math.min(p.current_checkpoint, 6)).padStart(2, "0")}
                <small>/06</small>
              </span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(p.completed.length / 6) * 100}%` }} />
            </div>
            <p className="progress-copy">
              {p.completed.length} of 6 checkpoints discovered
            </p>
            {p.clue ? (
              <>
                <span className="prepared">
                  <span /> {p.clue.source}
                </span>
                <h2 className="riddle">“{p.clue.text}”</h2>
                {p.clue.hint ? (
                  <div className="hint">
                    <Lightbulb size={18} />
                    {p.clue.hint}
                  </div>
                ) : (
                  <button
                    className="hint-button"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        await post(`/hunts/${id}/hint`, {
                          checkpointId: p.clue.id,
                        });
                        setMessage("Hint unlocked. 20 points deducted once.");
                      })
                    }
                  >
                    <Lightbulb size={17} /> Need a little direction?{" "}
                    <small>−20 pts</small>
                  </button>
                )}
                <div className="clue-rule" />
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await post(`/hunts/${id}/check-location`, {
                        checkpointId: p.clue.id,
                      });
                      const result = await post(
                        `/hunts/${id}/complete-checkpoint`,
                        { checkpointId: p.clue.id },
                      );
                      setMessage(
                        result.alreadyCompleted
                          ? "Already saved — no duplicate points."
                          : `Checkpoint discovered! +${result.points} points`,
                      );
                    })
                  }
                >
                  <LocateFixed size={18} />{" "}
                  {busy ? "Checking…" : "Check location"}
                </button>
                <p className="micro">
                  Within 80 meters? Your next clue awaits.
                </p>
              </>
            ) : (
              <div className="all-done">
                <Flag size={34} />
                <h2>You found your way.</h2>
                <p>
                  Every checkpoint is saved. Return home or reset your run
                  below.
                </p>
                <Link to="/" className="text-button">
                  Return home →
                </Link>
              </div>
            )}
          </section>
          <section className="card location-card">
            <div className="section-title">
              <h3>
                <MapPin size={18} /> Location
              </h3>
              {demo && (
                <label className="switch">
                  <input
                    type="checkbox"
                    aria-label="Demo Location Mode"
                    checked={demoMode}
                    onChange={(e) => {
                      setDemoMode(e.target.checked);
                      setGps(false);
                    }}
                  />
                  <span />
                </label>
              )}
            </div>
            <strong>
              {demoMode
                ? "Demo Location Mode"
                : gps
                  ? "Using browser GPS"
                  : "Location not enabled"}
            </strong>
            <p>
              {demoMode
                ? "Explore from your chair. These controls reveal the next destination."
                : "Share your location to verify arrival. GPS is reported by your browser."}
            </p>
            {demoMode ? (
              <button
                className="secondary full"
                disabled={busy || !!p.completed_at}
                onClick={() =>
                  action(async () => {
                    const loc = await post("/demo/arrival", {
                      huntId: Number(id),
                    });
                    setMessage(
                      `Demo location moved to ${loc.name}. Now check location.`,
                    );
                  })
                }
              >
                Simulate arrival <ArrowRight size={16} />
              </button>
            ) : (
              <button className="secondary full" onClick={() => setGps(!gps)}>
                {gps ? "Stop GPS" : "Enable GPS"}
              </button>
            )}
            {p.location && (
              <small className="coordinate">
                {p.location.latitude.toFixed(5)},{" "}
                {p.location.longitude.toFixed(5)} · {p.location.mode}
              </small>
            )}
          </section>
        </aside>
        <div className="map-column">
          <GameMap
            progress={p}
            players={players}
            checkpoints={checkpoints}
            demoMode={demoMode}
          />
          <div aria-live="polite">
            {(error || actionError) && (
              <p className="error" role="alert">
                {actionError || error}
              </p>
            )}
            {message && (
              <p className="success">
                <Check size={18} />
                {message}
              </p>
            )}
          </div>
          <section className="trail">
            <span className="eyebrow">YOUR DISCOVERY TRAIL</span>
            <div>
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={i < p.completed.length ? "trail-done" : ""}
                >
                  <b>
                    {i < p.completed.length ? (
                      <Check size={15} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </b>
                  {p.completed[i]?.name ||
                    (i === p.completed.length
                      ? "Current clue"
                      : "Undiscovered")}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Leaderboard rows={rows} synced={synced} />
      {demo && (
        <section className="demo-tools">
          <div>
            <strong>Local demo tools</strong>
            <p>
              Reset affects only your run. Other players keep their progress.
            </p>
          </div>
          <div className="button-row">
            {user.role === "organizer" && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => action(() => post("/demo/simulate", {}))}
              >
                Advance simulated opponent
              </button>
            )}
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setResetAsk(!resetAsk)}
            >
              <RotateCcw size={15} /> Reset my run
            </button>
            {resetAsk && (
              <button
                className="danger"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await post("/demo/reset", { huntId: Number(id) });
                    setResetAsk(false);
                    setMessage("Your run is ready to play again.");
                  })
                }
              >
                Confirm reset
              </button>
            )}
          </div>
        </section>
      )}
      {user.role === "organizer" && (
        <details className="organizer">
          <summary>Organizer studio · optional AI clue draft</summary>
          <p>
            Gameplay always uses prepared clues. Review optional drafts here; no
            key is required.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              action(async () =>
                setDraft(
                  await post("/ai/generate-clue", {
                    location: "Central Library",
                    difficulty: "medium",
                  }),
                ),
              )
            }
          >
            Draft a library clue
          </button>
          {draft && (
            <p>
              <strong>{draft.source}:</strong> {draft.clue}
            </p>
          )}
        </details>
      )}
    </main>
  );
}
