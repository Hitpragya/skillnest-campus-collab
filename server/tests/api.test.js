// API tests. Requires the built C++ worker (npm run build:engine) or PEERNEST_ENGINE_PATH.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { openDatabase } from "../src/db.js";
import { EngineClient } from "../src/engine.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peernest-test-"));
const config = loadConfig({ ...process.env, NODE_ENV: "test", DATABASE_PATH: path.join(tmp, "test.sqlite"), JWT_SECRET: "test-secret" });
let db, engine, app;

function boot() {
  db = openDatabase(config.databasePath);
  engine = new EngineClient(config.enginePath);
  app = createApp({ db, engine, config });
}
function shutdown() {
  engine.stop();
  db.close();
}

async function register(name, skills, extra = {}) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: `${name.toLowerCase()}@college.edu`, password: "password123", name, department: "CSE", year: 3, skills: skills.map((s) => ({ name: s, level: "intermediate" })), ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.token, id: res.body.student.id };
}
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

describe("PeerNest API", () => {
  let asha, bala, chen;
  before(async () => {
    boot();
    asha = await register("Asha", ["React", "Node"], { interests: ["hackathon"] });
    bala = await register("Bala", ["react"], { interests: ["hackathon"], availability: "busy" });
    chen = await register("Chen", ["Python"]);
  });
  after(() => {
    shutdown();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("health reports engine status", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { api: "ok", engine: "ok" });
  });

  test("register rejects duplicate email and bad input; never returns hash", async () => {
    const dup = await request(app).post("/api/auth/register").send({ email: "asha@college.edu", password: "password123", name: "A", department: "CSE", year: 3, skills: [] });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, "email_taken");
    const bad = await request(app).post("/api/auth/register").send({ email: "x", password: "1" });
    assert.equal(bad.status, 400);
    const row = db.prepare("SELECT password_hash FROM students WHERE email = ?").get("asha@college.edu");
    assert.match(row.password_hash, /^\$2[aby]\$/);
  });

  test("login and me", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: "asha@college.edu", password: "nope-nope" });
    assert.equal(wrong.status, 401);
    const ok = await request(app).post("/api/auth/login").send({ email: "ASHA@college.edu", password: "password123" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.student.password_hash, undefined);
    const me = await request(app).get("/api/auth/me").set(bearer(ok.body.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.email, "asha@college.edu");
  });

  test("protected routes require a valid token", async () => {
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
    assert.equal((await request(app).get("/api/requirements")).status, 401);
    assert.equal((await request(app).get("/api/students").set(bearer("garbage"))).status, 401);
  });

  test("skill search goes through the C++ engine (normalized, sorted, no emails)", async () => {
    const res = await request(app).get("/api/students?skills=%20REACT%20").set(bearer(asha.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((s) => s.name), ["Asha", "Bala"]);
    assert.ok(res.body.every((s) => s.email === undefined));
    assert.deepEqual(res.body[0].skills[0], { name: "React", level: "intermediate" });
    const filtered = await request(app).get("/api/students?skills=react&availability=busy").set(bearer(asha.token));
    assert.deepEqual(filtered.body.map((s) => s.name), ["Bala"]);
    const q = await request(app).get("/api/students?q=pyth").set(bearer(asha.token));
    assert.deepEqual(q.body.map((s) => s.name), ["Chen"]);
  });

  test("engine failure returns 503, not fake data", async () => {
    const broken = createApp({ db, engine: new EngineClient(path.join(tmp, "missing-engine")), config });
    const res = await request(broken).get("/api/students?skills=react").set(bearer(asha.token));
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, "engine_unavailable");
  });

  test("profile hides email; unknown id 404", async () => {
    const res = await request(app).get(`/api/students/${bala.id}`).set(bearer(asha.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.email, undefined);
    assert.equal((await request(app).get("/api/students/nope").set(bearer(asha.token))).status, 404);
  });

  test("recommendations use the approved score", async () => {
    const res = await request(app).get("/api/students/me/recommendations").set(bearer(asha.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].student.name, "Bala");
    assert.equal(res.body[0].matchScore, 11); // 10 * 1 shared skill + 1 shared interest
    assert.deepEqual(res.body[0].sharedSkills, ["react"]);
  });

  let urgentReq;
  test("create requirement", async () => {
    const res = await request(app).post("/api/requirements").set(bearer(asha.token))
      .send({ title: "Hackathon tomorrow", type: "hackathon", description: "Need help", requiredSkills: ["React"], teamSize: 3, deadline: "2026-12-01", priority: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.priority, 1);
    urgentReq = res.body.id;
    const bad = await request(app).post("/api/requirements").set(bearer(bala.token)).send({ title: "x", type: "x", description: "y", teamSize: 1, priority: 4 });
    assert.equal(bad.status, 400);
  });

  test("requirements list exposes public owner, full fields, newest first and mine filter", async () => {
    const newer = await request(app).post("/api/requirements").set(bearer(bala.token))
      .send({ title: "Study group", type: "study", description: "Prepare together", requiredSkills: ["React"], teamSize: 2, priority: 2 });
    assert.equal(newer.status, 201);
    const res = await request(app).get("/api/requirements").set(bearer(chen.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => r.id), [newer.body.id, urgentReq]);
    const post = res.body[1];
    assert.deepEqual(post.owner, { id: asha.id, name: "Asha", department: "CSE" });
    assert.equal(post.title, "Hackathon tomorrow");
    assert.equal(post.description, "Need help");
    assert.equal(post.type, "hackathon");
    assert.deepEqual(post.requiredSkills, ["React"]);
    assert.equal(post.teamSize, 3);
    assert.equal(post.deadline, "2026-12-01");
    assert.equal(post.priority, 1);
    assert.ok(Number.isFinite(Date.parse(post.createdAt)));
    assert.ok(res.body.every((r) => Object.keys(r.owner).sort().join(",") === "department,id,name"));
    assert.ok(!JSON.stringify(res.body).includes("password_hash"));
    const own = await request(app).get("/api/requirements?mine=true").set(bearer(asha.token));
    assert.deepEqual(own.body.map((r) => r.id), [urgentReq]);
    const empty = await request(app).get("/api/requirements?mine=true").set(bearer(chen.token));
    assert.deepEqual(empty.body, []);
    assert.equal((await request(app).get("/api/requirements?mine=invalid").set(bearer(asha.token))).status, 400);
  });

  test("linked requests reject missing requirements, wrong recipient and conflicting priority", async () => {
    const wrong = await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: bala.id, requirementId: urgentReq });
    assert.equal(wrong.status, 404);
    const missing = await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: asha.id, requirementId: "missing" });
    assert.equal(missing.status, 404);
    const conflict = await request(app).post("/api/requests").set(bearer(bala.token)).send({ toStudentId: asha.id, requirementId: urgentReq, priority: 3 });
    assert.equal(conflict.status, 400);
    assert.equal(conflict.body.error.code, "priority_conflict");
  });

  test("send requests: validation and pending order from C++ scheduler", async () => {
    const self = await request(app).post("/api/requests").set(bearer(asha.token)).send({ toStudentId: asha.id });
    assert.equal(self.status, 400);
    const ghost = await request(app).post("/api/requests").set(bearer(asha.token)).send({ toStudentId: "ghost" });
    assert.equal(ghost.status, 404);
    const notMine = await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: bala.id, requirementId: urgentReq });
    assert.equal(notMine.status, 404);

    const n1 = await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: asha.id, message: "first" });
    assert.equal(n1.status, 201);
    assert.equal(n1.body.priority, 2);
    assert.equal(n1.body.requirementTitle, "Collaboration request");
    const u1 = await request(app).post("/api/requests").set(bearer(bala.token)).send({ toStudentId: asha.id, requirementId: urgentReq });
    assert.equal(u1.status, 201);
    assert.equal(u1.body.requirementId, urgentReq);
    assert.equal(u1.body.requirementTitle, "Hackathon tomorrow");
    assert.equal(u1.body.from.id, bala.id);
    assert.equal(u1.body.to.id, asha.id);
    assert.equal(u1.body.priority, 1);
    assert.equal(u1.body.type, "hackathon");
    await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: asha.id, priority: 3, message: "low" });
    await request(app).post("/api/requests").set(bearer(chen.token)).send({ toStudentId: asha.id, priority: 1, message: "urgent2" });

    const res = await request(app).get("/api/requests?status=pending").set(bearer(asha.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => [r.priority, r.queue]), [[1, "urgent"], [1, "urgent"], [2, "normal"], [3, "normal"]]);
    assert.equal(res.body[0].requirementTitle, "Hackathon tomorrow"); // earlier urgent first
    assert.equal(res.body[2].message, "first");
  });

  test("only the recipient can accept/reject; resolved cannot change", async () => {
    const pending = (await request(app).get("/api/requests?status=pending").set(bearer(asha.token))).body;
    const target = pending[0];
    const forbidden = await request(app).patch(`/api/requests/${target.id}`).set(bearer(bala.token)).send({ status: "accepted" });
    assert.equal(forbidden.status, 403);
    const ok = await request(app).patch(`/api/requests/${target.id}`).set(bearer(asha.token)).send({ status: "accepted" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.status, "accepted");
    const again = await request(app).patch(`/api/requests/${target.id}`).set(bearer(asha.token)).send({ status: "rejected" });
    assert.equal(again.status, 409);
    const accepted = (await request(app).get("/api/requests?status=accepted").set(bearer(asha.token))).body;
    assert.deepEqual(accepted.map((r) => r.id), [target.id]);
    const stillPending = (await request(app).get("/api/requests?status=pending").set(bearer(asha.token))).body;
    assert.equal(stillPending.length, 3);
    assert.ok(!stillPending.some((r) => r.id === target.id));
    const rejected = await request(app).patch(`/api/requests/${stillPending[0].id}`).set(bearer(asha.token)).send({ status: "rejected" });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.status, "rejected");
    const rejectedList = await request(app).get("/api/requests?status=rejected").set(bearer(asha.token));
    assert.deepEqual(rejectedList.body.map((r) => r.id), [stillPending[0].id]);
  });

  test("data and ordering survive a restart", async () => {
    const beforeRestart = (await request(app).get("/api/requests").set(bearer(asha.token))).body.map((r) => r.id);
    shutdown();
    boot();
    const login = await request(app).post("/api/auth/login").send({ email: "asha@college.edu", password: "password123" });
    assert.equal(login.status, 200);
    const afterRestart = (await request(app).get("/api/requests").set(bearer(login.body.token))).body.map((r) => r.id);
    assert.deepEqual(afterRestart, beforeRestart);
  });
});
