// Express app. All routes are mounted under /api.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { z } from "zod";

const COLLAB = ["project", "hackathon", "study", "placement"];
const AVAIL = ["available", "limited", "busy"];
const LEVELS = ["beginner", "intermediate", "advanced"];

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const skillSchema = z.object({ name: z.string().trim().min(1).max(40), level: z.enum(LEVELS) });
const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80),
  department: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1).max(6),
  skills: z.array(skillSchema).max(30).default([]),
  interests: z.array(z.enum(COLLAB)).max(4).optional(),
  availability: z.enum(AVAIL).optional(),
  bio: z.string().trim().max(500).optional(),
  hoursPerWeek: z.coerce.number().int().min(0).max(80).optional(),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });
const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  skills: z.string().max(500).optional(),
  mode: z.enum(["any", "all"]).optional(),
  department: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  availability: z.enum(AVAIL).optional(),
  interest: z.enum(COLLAB).optional(),
});
const requirementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(COLLAB),
  description: z.string().trim().min(1).max(2000),
  requiredSkills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  teamSize: z.coerce.number().int().min(1).max(20),
  deadline: z.string().trim().max(40).optional().nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
const sendRequestSchema = z.object({
  toStudentId: z.string().min(1).max(64),
  message: z.string().trim().max(1000).optional(),
  requirementId: z.string().min(1).max(64).optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});
const respondSchema = z.object({ status: z.enum(["accepted", "rejected"]) });
const listRequestsSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  box: z.enum(["incoming", "outgoing"]).optional(),
});
const listRequirementsSchema = z.object({ mine: z.enum(["true", "false"]).optional() });

function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new HttpError(400, "validation_error", `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return r.data;
}

// ---- row mappers (never include password_hash) ----
function toStudent(row, { includeEmail = false } = {}) {
  const s = {
    id: row.id,
    name: row.name,
    department: row.department,
    year: row.year,
    bio: row.bio ?? undefined,
    skills: JSON.parse(row.skills_json),
    interests: JSON.parse(row.interests_json),
    availability: row.availability,
    hoursPerWeek: row.hours_per_week ?? undefined,
  };
  if (includeEmail) s.email = row.email;
  return s;
}
// Shape sent to the C++ engine: skill names only.
const toEngineStudent = (row) => {
  const s = toStudent(row);
  return { ...s, skills: s.skills.map((k) => k.name), hoursPerWeek: s.hoursPerWeek ?? 0 };
};
function toRequirement(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    requiredSkills: JSON.parse(row.required_skills_json),
    teamSize: row.team_size,
    deadline: row.deadline ?? undefined,
    priority: row.priority,
    createdAt: row.created_at,
    owner: { id: row.owner_id, name: row.owner_name, department: row.owner_department },
  };
}
function toRequest(row, queue) {
  const r = {
    id: row.id,
    from: { id: row.from_id, name: row.from_name, department: row.from_department },
    to: { id: row.to_id, name: row.to_name, department: row.to_department },
    requirementTitle: row.title,
    requirementId: row.requirement_id ?? undefined,
    type: row.type,
    message: row.message ?? undefined,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
  };
  if (queue) r.queue = queue;
  return r;
}

export function createApp({ db, engine, config }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  // ---- prepared statements ----
  const q = {
    insertStudent: db.prepare(`INSERT INTO students (id,name,email,password_hash,department,year,bio,availability,hours_per_week,skills_json,interests_json,created_at)
      VALUES (@id,@name,@email,@password_hash,@department,@year,@bio,@availability,@hours_per_week,@skills_json,@interests_json,@created_at)`),
    studentByEmail: db.prepare("SELECT * FROM students WHERE email = ?"),
    studentById: db.prepare("SELECT * FROM students WHERE id = ?"),
    allStudents: db.prepare("SELECT * FROM students ORDER BY created_at, id"),
    insertRequirement: db.prepare(`INSERT INTO requirements (id,owner_id,title,type,description,required_skills_json,team_size,deadline,priority,created_at)
      VALUES (@id,@owner_id,@title,@type,@description,@required_skills_json,@team_size,@deadline,@priority,@created_at)`),
    requirementById: db.prepare("SELECT * FROM requirements WHERE id = ?"),
    insertRequest: db.prepare(`INSERT INTO requests (id,from_id,to_id,requirement_id,title,type,message,priority,status,created_at,updated_at)
      VALUES (@id,@from_id,@to_id,@requirement_id,@title,@type,@message,@priority,'pending',@now,@now)`),
    requestById: db.prepare("SELECT * FROM requests WHERE id = ?"),
    updateRequestStatus: db.prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ? AND status = 'pending'"),
  };
  const requestSelect = `SELECT r.*, f.name AS from_name, f.department AS from_department, t.name AS to_name, t.department AS to_department
    FROM requests r JOIN students f ON f.id = r.from_id JOIN students t ON t.id = r.to_id`;
  const requestWithNames = db.prepare(`${requestSelect} WHERE r.id = ?`);
  const requestsFor = (column) => ({
    pending: db.prepare(`${requestSelect} WHERE r.${column} = ? AND r.status = 'pending' ORDER BY r.sequence ASC`),
    resolved: db.prepare(`${requestSelect} WHERE r.${column} = ? AND r.status = ? ORDER BY r.updated_at DESC, r.sequence DESC`),
  });
  const incoming = requestsFor("to_id");
  const outgoing = requestsFor("from_id");
  // Select only public owner fields; never join email or password data into board rows.
  const requirementSelect = `SELECT r.*, s.name AS owner_name, s.department AS owner_department
    FROM requirements r JOIN students s ON s.id = r.owner_id`;
  const allRequirements = db.prepare(`${requirementSelect} ORDER BY r.created_at DESC, r.rowid DESC`);
  const ownRequirements = db.prepare(`${requirementSelect} WHERE r.owner_id = ? ORDER BY r.created_at DESC, r.rowid DESC`);

  const signToken = (id) => jwt.sign({ sub: id }, config.jwtSecret, { algorithm: "HS256", expiresIn: "7d" });

  function auth(req, _res, next) {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return next(new HttpError(401, "unauthorized", "Missing bearer token"));
    try {
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
      const row = q.studentById.get(payload.sub);
      if (!row) return next(new HttpError(401, "unauthorized", "Account no longer exists"));
      req.me = row;
      next();
    } catch {
      next(new HttpError(401, "unauthorized", "Invalid or expired token"));
    }
  }

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const api = express.Router();

  // ---- health ----
  api.get("/health", wrap(async (_req, res) => {
    let engineOk = false;
    try {
      engineOk = (await engine.call({ action: "ping" })) === "pong";
    } catch {
      engineOk = false;
    }
    res.status(engineOk ? 200 : 503).json({ api: "ok", engine: engineOk ? "ok" : "unavailable" });
  }));

  // ---- auth ----
  api.post("/auth/register", wrap(async (req, res) => {
    const body = parse(registerSchema, req.body);
    if (q.studentByEmail.get(body.email)) throw new HttpError(409, "email_taken", "An account with this email already exists");
    const row = {
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email,
      password_hash: await bcrypt.hash(body.password, 10),
      department: body.department,
      year: body.year,
      bio: body.bio ?? null,
      availability: body.availability ?? "available",
      hours_per_week: body.hoursPerWeek ?? null,
      skills_json: JSON.stringify(body.skills),
      interests_json: JSON.stringify(body.interests ?? []),
      created_at: new Date().toISOString(),
    };
    q.insertStudent.run(row);
    res.status(201).json({ token: signToken(row.id), student: toStudent(row, { includeEmail: true }) });
  }));

  api.post("/auth/login", wrap(async (req, res) => {
    const body = parse(loginSchema, req.body);
    const row = q.studentByEmail.get(body.email);
    const ok = row ? await bcrypt.compare(body.password, row.password_hash) : false;
    if (!row || !ok) throw new HttpError(401, "invalid_credentials", "Email or password is incorrect");
    res.json({ token: signToken(row.id), student: toStudent(row, { includeEmail: true }) });
  }));

  api.get("/auth/me", auth, (req, res) => res.json(toStudent(req.me, { includeEmail: true })));

  // ---- students (search and recommendations run in C++) ----
  api.get("/students", auth, wrap(async (req, res) => {
    const f = parse(searchSchema, req.query);
    const rows = q.allStudents.all();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const result = await engine.call({
      action: "searchStudents",
      students: rows.map(toEngineStudent),
      filters: {
        q: f.q,
        skills: f.skills ? f.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        mode: f.mode ?? "any",
        department: f.department,
        year: f.year,
        availability: f.availability,
        interest: f.interest,
      },
    });
    // Keep the engine's order; re-attach full records (with skill levels) from SQLite.
    res.json(result.map((s) => byId.get(s.id)).filter(Boolean).map((r) => toStudent(r)));
  }));

  // Must be registered before /students/:id
  api.get("/students/me/recommendations", auth, wrap(async (req, res) => {
    const rows = q.allStudents.all();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const result = await engine.call({
      action: "recommendStudents",
      students: rows.map(toEngineStudent),
      studentId: req.me.id,
      limit: 10,
    });
    res.json(
      result
        .filter((r) => byId.has(r.student.id))
        .map((r) => ({ student: toStudent(byId.get(r.student.id)), matchScore: r.score, sharedSkills: r.sharedSkills })),
    );
  }));

  api.get("/students/:id", auth, (req, res, next) => {
    const row = q.studentById.get(req.params.id);
    if (!row) return next(new HttpError(404, "not_found", "Student not found"));
    res.json(toStudent(row)); // no email for profile views
  });

  // ---- requirements ----
  api.get("/requirements", auth, (req, res) => {
    const { mine } = parse(listRequirementsSchema, req.query);
    const rows = mine === "true" ? ownRequirements.all(req.me.id) : allRequirements.all();
    res.json(rows.map(toRequirement));
  });

  api.post("/requirements", auth, (req, res) => {
    const body = parse(requirementSchema, req.body);
    const row = {
      id: crypto.randomUUID(),
      owner_id: req.me.id,
      title: body.title,
      type: body.type,
      description: body.description,
      required_skills_json: JSON.stringify(body.requiredSkills),
      team_size: body.teamSize,
      deadline: body.deadline || null,
      priority: body.priority,
      created_at: new Date().toISOString(),
    };
    q.insertRequirement.run(row);
    res.status(201).json(toRequirement({ ...row, owner_name: req.me.name, owner_department: req.me.department }));
  });

  // ---- requests ----
  api.get("/requests", auth, wrap(async (req, res) => {
    const { status, box } = parse(listRequestsSchema, req.query);
    const stmts = box === "outgoing" ? outgoing : incoming;
    const out = [];
    if (!status || status === "pending") {
      const rows = stmts.pending.all(req.me.id); // ascending SQL sequence = arrival order
      const byId = new Map(rows.map((r) => [r.id, r]));
      const ordered = await engine.call({
        action: "orderRequests",
        requests: rows.map((r) => ({
          id: r.id,
          fromStudentId: r.from_id,
          toStudentId: r.to_id,
          title: r.title,
          message: r.message ?? "",
          priority: r.priority,
        })),
      });
      for (const o of ordered) if (byId.has(o.id)) out.push(toRequest(byId.get(o.id), o.queue));
    }
    for (const s of ["accepted", "rejected"]) {
      if (!status || status === s) out.push(...stmts.resolved.all(req.me.id, s).map((r) => toRequest(r)));
    }
    res.json(out);
  }));

  api.post("/requests", auth, (req, res) => {
    const body = parse(sendRequestSchema, req.body);
    if (body.toStudentId === req.me.id) throw new HttpError(400, "invalid_target", "You cannot send a request to yourself");
    if (!q.studentById.get(body.toStudentId)) throw new HttpError(404, "not_found", "Target student not found");
    let title = "Collaboration request";
    let type = "project";
    let priority = body.priority ?? 2;
    let requirementId = null;
    if (body.requirementId) {
      const reqRow = q.requirementById.get(body.requirementId);
      if (!reqRow || reqRow.owner_id !== body.toStudentId) throw new HttpError(404, "not_found", "Requirement not found for this recipient");
      // Linked requests always inherit persisted metadata; reject conflicting client priority.
      if (body.priority !== undefined && body.priority !== reqRow.priority) {
        throw new HttpError(400, "priority_conflict", "Priority is determined by the saved requirement");
      }
      title = reqRow.title;
      type = reqRow.type;
      priority = reqRow.priority;
      requirementId = reqRow.id;
    }
    const id = crypto.randomUUID();
    q.insertRequest.run({
      id,
      from_id: req.me.id,
      to_id: body.toStudentId,
      requirement_id: requirementId,
      title,
      type,
      message: body.message || null,
      priority,
      now: new Date().toISOString(),
    });
    res.status(201).json(toRequest(requestWithNames.get(id)));
  });

  api.patch("/requests/:id", auth, (req, res) => {
    const { status } = parse(respondSchema, req.body);
    const update = db.transaction(() => {
      const row = q.requestById.get(req.params.id);
      if (!row) throw new HttpError(404, "not_found", "Request not found");
      if (row.to_id !== req.me.id) throw new HttpError(403, "forbidden", "Only the recipient can respond to this request");
      if (row.status !== "pending") throw new HttpError(409, "already_resolved", `Request is already ${row.status}`);
      q.updateRequestStatus.run(status, new Date().toISOString(), row.id);
    });
    update();
    res.json(toRequest(requestWithNames.get(req.params.id)));
  });

  app.use("/api", api);

  app.use((_req, _res, next) => next(new HttpError(404, "not_found", "Route not found")));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: { code: "invalid_json", message: "Malformed JSON body" } });
    if (err?.name === "EngineError" || err?.constructor?.name === "EngineError") {
      console.error("[engine]", err.message);
      return res.status(503).json({ error: { code: "engine_unavailable", message: "The C++ engine is unavailable" } });
    }
    console.error(err);
    res.status(500).json({ error: { code: "internal_error", message: "Unexpected server error" } });
  });

  return app;
}
