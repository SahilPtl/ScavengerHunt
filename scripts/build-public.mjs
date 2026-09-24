import { spawnSync } from "node:child_process";
const command =
  process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm --prefix client run build"]
    : ["--prefix", "client", "run", "build"];
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: { ...process.env, VITE_PUBLIC: "true" },
});
process.exitCode = result.status || 0;
