// SQLite persistence. This is the source of truth for all stored data.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  department     TEXT NOT NULL,
  year           INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  bio            TEXT,
  availability   TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available','limited','busy')),
  hours_per_week INTEGER,
  skills_json    TEXT NOT NULL DEFAULT '[]',
  interests_json TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
  id                   TEXT PRIMARY KEY,
  owner_id             TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('project','hackathon','study','placement')),
  description          TEXT NOT NULL,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  team_size            INTEGER NOT NULL CHECK (team_size BETWEEN 1 AND 20),
  deadline             TEXT,
  priority             INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  created_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requirements_owner ON requirements(owner_id);

CREATE TABLE IF NOT EXISTS requests (
  sequence       INTEGER PRIMARY KEY AUTOINCREMENT,
  id             TEXT NOT NULL UNIQUE,
  from_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  to_id          TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('project','hackathon','study','placement')),
  message        TEXT,
  priority       INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  CHECK (from_id <> to_id)
);
CREATE INDEX IF NOT EXISTS idx_requests_to_status ON requests(to_id, status, sequence);
CREATE INDEX IF NOT EXISTS idx_requests_from ON requests(from_id);
`;

export function openDatabase(databasePath) {
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA); // idempotent
  return db;
}
