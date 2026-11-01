import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");
const exe = process.platform === "win32" ? "peernest_worker.exe" : "peernest_worker";

const DEV_ONLY_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";
  const jwtSecret = env.JWT_SECRET || (isProd ? "" : DEV_ONLY_SECRET);
  if (isProd && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set (at least 32 characters) when NODE_ENV=production");
  }
  const corsOrigins = (env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    nodeEnv,
    isProd,
    port: Number(env.PORT || 4000),
    jwtSecret,
    // DATABASE_URL (e.g. Neon PostgreSQL) wins when set; otherwise local SQLite at DATABASE_PATH.
    // Never log databaseUrl: it contains the password.
    databaseUrl: env.DATABASE_URL ? env.DATABASE_URL.trim() || undefined : undefined,
    databasePath: env.DATABASE_PATH || path.join(serverRoot, "data", "peernest.sqlite"),
    corsOrigins,
    enginePath: env.PEERNEST_ENGINE_PATH || path.resolve(serverRoot, "..", "engine", "build", exe),
  };
}
