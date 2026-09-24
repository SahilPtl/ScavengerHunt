import { useEffect, useState } from "react";
export function formatTime(seconds) {
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
export default function Timer({ start, end }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  return (
    <>
      {formatTime(
        Math.max(
          0,
          Math.floor(
            ((end ? new Date(end).getTime() : now) -
              new Date(start).getTime()) /
              1000,
          ),
        ),
      )}
    </>
  );
}
