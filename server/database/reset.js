import { pool } from "./db.js";
import { config } from "../config.js";
if (!config.demo) {
  console.error("Reset disabled outside local demo.");
  process.exitCode = 1;
} else {
  await pool.query(
    "DELETE FROM hunt_participants WHERE user_id IN (SELECT id FROM users WHERE demo_account=true)",
  );
  console.log(
    "Only seeded demo participant runs reset. Accounts and registered players preserved.",
  );
}
await pool.end();
