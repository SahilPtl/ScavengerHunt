import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Flag, Clock, Users, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
export default function DashboardPage() {
  const { user, demo } = useAuth(),
    navigate = useNavigate();
  const [hunts, setHunts] = useState([]),
    [team, setTeam] = useState(user.name),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/hunts")
      .then(setHunts)
      .catch((e) => setError(e.message));
  }, []);
  async function join(id) {
    setBusy(true);
    try {
      await api(`/hunts/${id}/join`, {
        method: "POST",
        body: { teamName: team },
      });
      navigate(`/hunt/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GO BEYOND THE EVERYDAY</span>
          <h1>
            Welcome, {user.name.split(" ")[0]}
            <span className="accent">.</span>
          </h1>
          <p className="muted">
            A familiar campus. Six new reasons to look closer.
          </p>
        </div>
        <span className="date-label">
          MNNIT ALLAHABAD
          <br />
          <strong>Prayagraj, India</strong>
        </span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="dashboard-grid">
        <section className="hunt-feature">
          <div className="hunt-art">
            <img src="/campus.svg" alt="Campus schematic" />
            <span className="pill">THE SIGNATURE HUNT</span>
            <span className="art-number">
              01<span>/ EXPLORE MNNIT</span>
            </span>
          </div>
          <div className="hunt-content">
            <span className="eyebrow">AVAILABLE NOW</span>
            <h2>{hunts[0]?.name || "Loading campus challenge…"}</h2>
            <p>
              From quiet shelves to open fields, follow six clues through the
              places that make this campus yours.
            </p>
            <div className="hunt-facts">
              <span>
                <Flag />6 checkpoints
              </span>
              <span>
                <Clock />
                30–45 min walking
              </span>
              <span>
                <Users />
                {hunts[0]?.players || 0} real explorers
              </span>
            </div>
            <label>
              Player / team name
              <input
                value={team}
                maxLength={60}
                onChange={(e) => setTeam(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="primary"
                disabled={busy || !hunts.length}
                onClick={() => join(hunts[0].id)}
              >
                Start / resume hunt <ArrowRight size={18} />
              </button>
              <Link className="secondary" to="/leaderboard">
                Leaderboard <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <aside>
          <div className="card field-guide">
            <span className="eyebrow">A QUICK FIELD GUIDE</span>
            <h2>
              Curiosity leads
              <br />
              the way.
            </h2>
            {[
              [
                "01",
                "Read between the lines",
                "Solve a clue to discover your next destination.",
              ],
              [
                "02",
                "Find your way",
                "Use the map and validate your location.",
              ],
              [
                "03",
                "Make it count",
                "Earn points and watch the leaderboard move.",
              ],
            ].map(([n, t, d]) => (
              <div className="guide-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
          {demo && (
            <div className="small-note">
              <strong>Your interview-room adventure</strong>
              <p>
                Demo Location Mode completes the full trail from this laptop.
                About 5 minutes. No GPS or paid API needed.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
