// PostgreSQL adapter tests using pg-mem (an in-process Postgres emulator).
// This checks SQL syntax, $n parameter mapping, constraints and atomic request resolution.
// It is NOT a substitute for a test against a real Neon/PostgreSQL server.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { newDb } from "pg-mem";
import { openPostgres } from "../src/db.js";

const now = () => new Date().toISOString();
const student = (id, email) => ({
  id, name: id.toUpperCase(), email, password_hash: "$2a$10$x", department: "CSE", year: 2, bio: null,
  availability: "available", hours_per_week: null, skills_json: '["react"]', interests_json: "[]", created_at: now(),
});
const reqRow = (id, from, to, priority) => ({
  id, from_id: from, to_id: to, requirement_id: null, title: "Collaboration request", type: "project",
  message: null, priority, status: "pending", created_at: now(), updated_at: now(),
});

describe("PostgreSQL repository (pg-mem)", () => {
  let repo;
  before(async () => {
    const mem = newDb();
    const { Pool } = mem.adapters.createPg();
    repo = await openPostgres({ pool: new Pool() });
    await openPostgres({ pool: new Pool() }).catch(() => {}); // schema creation is re-run safely
    await repo.insertStudent(student("a", "a@example.com"));
    await repo.insertStudent(student("b", "b@example.com"));
  });
  after(async () => repo.close());

  test("students round-trip with identical column names; email lookup is case-insensitive", async () => {
    const row = await repo.findStudentByEmail("A@EXAMPLE.COM");
    assert.equal(row.id, "a");
    assert.equal(row.skills_json, '["react"]');
    assert.equal(row.year, 2);
    assert.equal((await repo.listStudents()).length, 2);
  });

  test("profile updates keep the email and password columns intact", async () => {
    const original = await repo.findStudentById("a");
    const updated = await repo.updateStudentProfile("a", {
      name: "Asha", department: "CSE", year: 3, bio: "Updated", availability: "limited",
      hours_per_week: 6, skills_json: '["typescript"]', interests_json: '["project"]',
    });
    assert.equal(updated.email, original.email);
    assert.equal(updated.password_hash, original.password_hash);
    assert.equal(updated.skills_json, '["typescript"]');
    assert.equal(updated.hours_per_week, 6);
  });

  test("duplicate email (different case) is rejected", async () => {
    await assert.rejects(repo.insertStudent(student("c", "B@example.com")));
  });

  test("CHECK constraints are enforced", async () => {
    await assert.rejects(repo.insertRequest(reqRow("bad", "a", "b", 7)));
    await assert.rejects(repo.insertRequest(reqRow("self", "a", "a", 2)));
  });

  test("requirements list joins public owner fields", async () => {
    await repo.insertRequirement({
      id: "rq1", owner_id: "a", title: "Team", type: "hackathon", description: "d",
      required_skills_json: "[]", team_size: 3, deadline: null, priority: 1, created_at: now(),
    });
    const [r] = await repo.listRequirements(null);
    assert.equal(r.owner_name, "Asha");
    assert.equal(r.email, undefined);
    assert.equal((await repo.listRequirements("b")).length, 0);
    assert.equal((await repo.findRequirementById("rq1")).priority, 1);
  });

  test("pending requests come back in arrival order", async () => {
    for (const [id, p] of [["r1", 3], ["r2", 1], ["r3", 2]]) {
      const d = await repo.insertRequest(reqRow(id, "a", "b", p));
      assert.equal(d.from_name, "Asha");
    }
    const ids = (await repo.listRequests("b", "incoming", "pending")).map((r) => r.id);
    assert.deepEqual(ids, ["r1", "r2", "r3"]);
    assert.equal((await repo.listRequests("a", "outgoing", "pending")).length, 3);
  });

  test("resolveRequest enforces recipient and pending-only", async () => {
    assert.deepEqual(await repo.resolveRequest("missing", "b", "accepted"), { result: "not_found" });
    assert.deepEqual(await repo.resolveRequest("r1", "a", "accepted"), { result: "forbidden" });
    assert.deepEqual(await repo.resolveRequest("r1", "b", "accepted"), { result: "ok" });
    assert.deepEqual(await repo.resolveRequest("r1", "b", "rejected"), { result: "already_resolved", status: "accepted" });
    const accepted = await repo.listRequests("b", "incoming", "accepted");
    assert.deepEqual(accepted.map((r) => r.id), ["r1"]);
  });
});
