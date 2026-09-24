import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import Leaderboard from "../components/Leaderboard";
export default function LeaderboardPage() {
  const [rows, setRows] = useState([]),
    [synced, setSynced] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let stopped = false,
      timer;
    const controller = new AbortController();
    async function load() {
      try {
        const data = await api("/hunts/1/leaderboard", {
          signal: controller.signal,
        });
        if (!stopped) {
          setRows(data);
          setSynced(new Date());
          setError("");
        }
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      }
      if (!stopped) timer = setTimeout(load, 2500);
    }
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return (
    <main className="page">
      <Link className="back" to="/">
        ← All hunts
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span>
          <h1>Every discovery counts.</h1>
          <p className="muted">Shared progress, refreshed every 2.5 seconds.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <Leaderboard rows={rows} synced={synced} />
    </main>
  );
}
