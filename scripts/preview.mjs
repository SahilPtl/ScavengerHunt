// Safe public-preview process: separate port, no demo accounts or controls.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "client/dist/assets");
if (
  !fs.existsSync(assets) ||
  fs
    .readdirSync(assets)
    .some(
      (f) =>
        f.endsWith(".js") &&
        fs
          .readFileSync(path.join(assets, f), "utf8")
          .includes("demo@mnnit.com"),
    )
)
  throw Error(
    "First run node scripts/build-public.mjs to remove demo credentials from public assets.",
  );
const secretFile = path.join(root, ".local/preview-secret");
fs.mkdirSync(path.dirname(secretFile), { recursive: true });
if (!fs.existsSync(secretFile))
  fs.writeFileSync(secretFile, randomBytes(48).toString("hex"), {
    mode: 0o600,
  });
process.env.NODE_ENV = "production";
process.env.DEMO_MODE = "false";
process.env.PORT = "3003";
process.env.HOST = "127.0.0.1";
process.env.JWT_SECRET = fs.readFileSync(secretFile, "utf8");
await import("../server/server.js");
