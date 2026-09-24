import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
export function useHunt(id) {
  const [progress, setProgress] = useState(null),
    [rows, setRows] = useState([]),
    [players, setPlayers] = useState([]),
    [error, setError] = useState(""),
    [synced, setSynced] = useState(null);
  const refresh = useCallback(
    async (signal) => {
      try {
        const [p, l, m] = await Promise.all([
          api(`/hunts/${id}/progress`, { signal }),
          api(`/hunts/${id}/leaderboard`, { signal }),
          api(`/hunts/${id}/players`, { signal }),
        ]);
        if (signal?.aborted) return;
        setProgress(p);
        setRows(l);
        setPlayers(m);
        setSynced(new Date());
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      }
    },
    [id],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let stopped = false;
    async function poll() {
      await refresh(controller.signal);
      if (!stopped) timer = setTimeout(poll, 2500);
    }
    poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh]);
  return { progress, rows, players, error, synced, refresh };
}
