import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./database/db.js";
const server = app.listen(config.port, config.host, () =>
  console.log(
    `Campus Hunt: http://${config.host}:${config.port} | Demo controls ${config.demo ? "enabled" : "disabled"}`,
  ),
);
server.on("error", (error) => {
  console.error(`Cannot listen on ${config.host}:${config.port} (${error.code}). Check whether the port is occupied or reserved.`);
  pool.end().finally(() => process.exit(1));
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
