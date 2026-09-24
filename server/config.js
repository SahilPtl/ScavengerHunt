import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.join(root, "server/.env") });
const production = process.env.NODE_ENV === "production";
let secret = process.env.JWT_SECRET?.trim();
if (!secret) {
  if (production) throw Error("JWT_SECRET required in production");
  fs.mkdirSync(path.join(root, ".local"), { recursive: true });
  const p = path.join(root, ".local/jwt-secret");
  if (!fs.existsSync(p))
    fs.writeFileSync(p, randomBytes(48).toString("hex"), { mode: 0o600 });
  secret = fs.readFileSync(p, "utf8");
}
export const config = {
  production,
  secret,
  demo: !production && process.env.DEMO_MODE !== "false",
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "127.0.0.1",
  database:
    process.env.DATABASE_URL ||
    "postgresql://postgres@127.0.0.1:5432/scavenger_hunt",
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3002",
};
