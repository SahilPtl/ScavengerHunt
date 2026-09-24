import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = path.join(root, ".local/server-pid");
if (fs.existsSync(pidFile)) {
  const pid = Number(fs.readFileSync(pidFile, "utf8"));
  if (Number.isSafeInteger(pid) && pid > 0 && process.platform === "win32") {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`,
      ],
      { encoding: "utf8" },
    );
    if (result.stdout?.includes(path.join(root, "server/server.js")))
      try {
        process.kill(pid);
      } catch {}
  } else if (process.platform !== "win32")
    console.log("Use Ctrl+C in the demo terminal to stop its API.");
  fs.unlinkSync(pidFile);
}
if (
  process.platform === "win32" &&
  fs.existsSync(path.join(root, ".local/postgres/PG_VERSION"))
)
  spawnSync(
    "C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe",
    ["-D", path.join(root, ".local/postgres"), "-m", "fast", "stop"],
    { stdio: "inherit" },
  );
console.log(
  "Project stop complete. Existing PostgreSQL services were not changed.",
);
