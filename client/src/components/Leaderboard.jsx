import { Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
export default function Leaderboard({ rows = [], synced }) {
  const { user } = useAuth();
  return (
    <section className="card leaderboard">
      <div className="section-title">
        <div>
          <span className="eyebrow">THE CAMPUS, CONNECTED</span>
          <h2>
            <Trophy size={20} /> Live leaderboard
          </h2>
        </div>
        <span className="live">
          <i />
          {synced
            ? "Updated " +
              synced.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "Syncing"}
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>RANK</th>
              <th>EXPLORER / TEAM</th>
              <th>CHECKPOINTS</th>
              <th>POINTS</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.user_id}
                className={p.user_id === user?.id ? "your-row" : ""}
              >
                <td>
                  <span className={"rank rank-" + i}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </td>
                <td>
                  <strong>{p.team_name}</strong>{" "}
                  {p.user_id === user?.id && <small className="you">YOU</small>}
                  {p.simulated && (
                    <small className="simulation">SIMULATED</small>
                  )}
                </td>
                <td>
                  <span className="mini-progress">
                    <span style={{ width: `${(p.completed / 6) * 100}%` }} />
                  </span>
                  {p.completed}/6
                </td>
                <td className="points">{p.score}</td>
                <td>
                  <span className="status">
                    {p.completed_at ? "Finished" : "Exploring"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty">The trail is yours. Be the first to join.</p>
        )}
      </div>
    </section>
  );
}
