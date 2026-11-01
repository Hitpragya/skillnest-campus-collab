import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { EngineClient } from "./engine.js";

const config = loadConfig();
if (!config.isProd && !process.env.JWT_SECRET) {
  console.warn("[peernest] Using a DEVELOPMENT-ONLY JWT secret. Set JWT_SECRET before deploying.");
}
const db = openDatabase(config.databasePath);
const engine = new EngineClient(config.enginePath);
engine.start(); // fail fast if the C++ worker has not been built

const app = createApp({ db, engine, config });
const server = app.listen(config.port, () => {
  console.log(`[peernest] API on http://localhost:${config.port}/api  (db: ${config.databasePath})`);
});

function shutdown() {
  server.close(() => {
    engine.stop();
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
