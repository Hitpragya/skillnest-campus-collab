# PeerNest Backend Plan (aligned with approved proposal)

Scope: C++17 engine using exactly `std::vector`, `std::unordered_map`, `std::queue`, `std::priority_queue`. Trie and Weighted Graph are out of scope and must be removed from "core" claims in the UI. No code is changed until this plan is approved.

## 1. Findings from the current frontend

Contract lives in `src/lib/api/types.ts` and `src/lib/api/endpoints.ts`. Mismatches to fix:

| # | Where | Issue |
|---|---|---|
| M1 | `architecture.tsx`, `endpoints.ts` comments | Trie + Weighted Graph shown as core; search described as "hash map + trie", recommendations as "graph-based". |
| M2 | `POST /requests` body | Only `{ toStudentId, message }`. No requirement link, no urgency flag, so the engine cannot decide queue vs priority_queue. |
| M3 | `priority` meaning | Requirement uses `1 \| 2 \| 3`; sample data and UI imply **1 = highest**. `std::priority_queue` is a max-heap by default, so direction must be fixed explicitly. Ambiguous today. |
| M4 | Requirement vs request | `requirementTitle`/`type` on a request are free fields, not a reference to a stored requirement. |
| M5 | Recommendations | `matchScore` is described as graph output. Without a graph, it must be defined as skill-overlap count from the unordered_map index. |
| M6 | `GET /students?q=` | Free-text `q` (name/prefix) was meant for the Trie. Without it: case-insensitive substring scan over the vector, O(n). Acceptable, but must be stated honestly. |
| M7 | "Normal FIFO vs urgent" | Proposal has two structures; frontend has one inbox list. Need a defined merge order (below). |

Decisions needing your confirmation are marked **[CONFIRM]**.

## 2. Architecture

```text
Browser (PeerNest, TanStack Start)
   |  HTTPS + JWT
   v
Node.js / Express API  ---- SQL ---->  PostgreSQL (Supabase or local)
   |  (auth, validation, persistence, ownership checks)
   |  native call via N-API addon
   v
C++17 engine (libpeernest)  -- vector, unordered_map, queue, priority_queue
```

- One Express service, one C++ library. No extra microservices.
- C++ is built as a static library + two front-ends: (a) a Node N-API addon (`node-addon-api`) used by Express; (b) a CLI/test binary for unit tests and live demos in the viva.
- Postgres is the source of truth for persistence. The C++ engine is the source of truth for **search, indexing, recommendation scoring and request ordering**. Node never sorts or matches in JS.
- Startup: Express loads all students and pending requests from Postgres and pushes them into the engine (rebuild). Every write: Postgres first (transaction), then engine update. If the engine update fails, the API returns 500 and rebuilds — never pretends success.
- Alternative if N-API is too hard to build on your machine: spawn a long-running C++ process speaking JSON lines over stdin/stdout. Same engine code. **[CONFIRM preferred option; N-API recommended.]**

## 3. Exact responsibility of each structure

```text
struct Student { int idx; std::string uuid, name, dept; int year; std::vector<Skill> skills; ... };
struct Request { std::string id, from, to; int priority; uint64_t seq; bool urgent; };
```

1. **`std::vector<Student> students`** — owns all student records in memory. Index in the vector is the internal id. Used for: `GET /students/:id` (via uuid->index map), full scans for filters (department, year, availability, interest, `q` substring).
2. **`std::unordered_map<std::string, std::vector<int>> skillIndex`** — key = normalised skill name (lowercase, trimmed), value = vector indices of students with that skill. Plus `unordered_map<std::string,int> idIndex` (uuid -> vector index). Used for: `GET /students?skills=react,node` (intersect posting lists, O(k) average lookups) and recommendations (count overlap of my skills across lists).
3. **`std::queue<Request>` per recipient** — normal (non-urgent) pending requests in strict FIFO arrival order.
4. **`std::priority_queue<Request, std::vector<Request>, UrgentCmp>` per recipient** — urgent requests.
   Stored as `unordered_map<recipientUuid, Inbox{ queue, priority_queue }>`.

Recommendations (replaces graph): for the current user, walk their skills in `skillIndex`, count shared skills per other student, add +1 if any interest matches, return top 10. `matchScore = sharedSkills + interestBonus`, documented exactly. Sorting top-K uses `std::partial_sort` on a vector (allowed STL algorithm, not a new structure). **[CONFIRM formula]**

## 4. Request ordering rules

- Priority scale: `1 = urgent/high, 2 = normal, 3 = low`. **[CONFIRM — matches current UI.]**
- `urgent = (priority == 1)` -> priority_queue; otherwise -> FIFO queue. **[CONFIRM: should priority 3 also go to the FIFO queue? Plan: yes, priority 2 and 3 share the FIFO queue, so priority 3 only labels, it does not reorder.]**
- Inside the priority_queue: lower `priority` number first, tie broken by smaller `seq` (earlier arrival). `seq` is a monotonic counter persisted as a `bigserial` in Postgres, so ordering survives restarts and does not depend on clock precision.
- Inbox served order (`GET /requests?status=pending`): **all urgent first (priority_queue order), then normal (FIFO order)**. Simple and explainable. Starvation of normal requests is accepted and stated as a known limitation. **[CONFIRM]**
- Reading the order must not destroy the heap: engine copies the containers and pops from the copies (O(n log n)), explained in viva.
- Accept/reject (`PATCH /requests/:id`) removes a request. `std::queue`/`priority_queue` cannot erase in the middle, so use **lazy deletion**: keep `unordered_set<id> resolved`; skip resolved items when popping; rebuild when stale ratio > 50%.
- Accepted/rejected lists come from Postgres ordered by `updated_at desc` (no DSA claim).

## 5. API contract changes (small, backward compatible)

- `POST /requests` body becomes `{ toStudentId, message?, requirementId?, priority?: 1|2|3 }`. If `requirementId` given, priority/title/type are taken from the stored requirement (owned by sender). Default priority 2.
- `CollaborationRequest` gains `requirementId?: string` and `queue: "urgent" | "normal"` (so the UI can show which structure served it).
- `GET /requests` adds `?box=incoming|outgoing` (default incoming). Engine ordering applies to incoming pending only.
- `GET /requirements/mine` (new, small) so the request form can pick a requirement. **[CONFIRM or skip]**
- Error shape: `{ error: { code, message } }` with proper HTTP status; the frontend client already surfaces failures.
- No other route changes. Update comments in `endpoints.ts` and the Architecture page to remove Trie/Graph from core (move to an "Optional extensions — not implemented" section).

## 6. Database (PostgreSQL) and security

Tables:
- `students(id uuid pk, email unique, password_hash, name, department, year, bio, availability, hours_per_week, created_at)`
- `student_skills(student_id fk, skill text, level, pk(student_id, skill))`
- `student_interests(student_id fk, interest, pk(...))`
- `requirements(id uuid pk, owner_id fk, title, type, description, required_skills text[], team_size, deadline, priority smallint check 1..3, created_at)`
- `requests(id uuid pk, seq bigserial unique, from_id fk, to_id fk, requirement_id fk null, message, priority, status check in (pending,accepted,rejected), created_at, updated_at, unique pending pair constraint)`

Security:
- Auth in Express: bcrypt password hashes, short-lived JWT (secret in server env only). Alternatively use Supabase Auth and verify its JWT in Express. **[CONFIRM: own auth vs Supabase Auth]**
- Postgres is reached only by Express with a server-side connection string; the browser never talks to the DB. If hosted on Supabase, enable RLS with no anon policies so the public keys cannot read tables.
- Ownership checks in Express: only the recipient can PATCH a request; only the owner creates requests from their requirement; cannot send to self; email never returned in directory lists (only on `/auth/me`).
- Input validation with `zod` on every route; skill names normalised before reaching C++.
- C++ addon receives plain validated values only, never SQL or tokens.

## 7. Local development and deployment

Repo layout (monorepo, frontend untouched):
```text
/            existing frontend
/engine      C++17: include/, src/, tests/ (CMake + GoogleTest or doctest), cli/
/server      Express + TypeScript, N-API binding in server/native (cmake-js)
/db          SQL migrations + dev-only seed script (clearly labelled, never run in prod)
docker-compose.yml   postgres + server
```
- Local: `docker compose up db`, `cmake --build engine && ctest`, `npm run dev` in server, set `VITE_PEERNEST_API_URL=http://localhost:4000` for the frontend.
- Deploy: the Express+addon service in a Docker container (Render/Railway/Fly — needs native builds, so not a Cloudflare Worker). Postgres on Supabase or the host's managed Postgres. Frontend stays on Lovable, pointing to the API URL. CORS restricted to the frontend origin.

## 8. Staged implementation (test after each stage)

1. **Stage 1 — C++ engine core (FIRST MILESTONE).** `StudentStore` (vector + idIndex + skillIndex): add, get, search by skills/filters, recommendations. Tests: add 5 students, search "react" returns correct ids, multi-skill intersection, case normalisation, unknown skill -> empty, score formula values.
2. **Stage 2 — C++ request scheduler.** Inbox with queue + priority_queue + lazy deletion. Tests: FIFO order of 3 normals; urgent before normal; equal priority tie-break by seq; resolve middle item then list; rebuild after many deletions.
3. **Stage 3 — CLI demo binary** for the viva (load JSON, run commands, print order). Test: scripted input -> expected output file.
4. **Stage 4 — DB schema + migrations.** Test: migrations apply on empty DB; constraints reject priority 4 and duplicate pending pair.
5. **Stage 5 — Express skeleton + auth** (`/auth/register|login|me`). Tests (supertest): register, duplicate email 409, bad password 401, `/me` without token 401.
6. **Stage 6 — N-API binding + startup rebuild.** Test: Node calls engine search, result matches C++ unit test; restart server and order is identical.
7. **Stage 7 — Student and requirement routes.** Tests: filters, 404 for unknown id, email hidden in list.
8. **Stage 8 — Request routes.** Tests: send, list order matches Stage 2 rules end-to-end, only recipient can PATCH (403), self-request 400.
9. **Stage 9 — Frontend alignment (small).** Update types/endpoints for new optional fields, request form priority/requirement picker, Architecture page rewritten to the four approved structures with Trie/Graph under "Optional extensions — not implemented". Check every page with the live API.
10. **Stage 10 — Docker + deploy** and set the API URL.

## First milestone

Stage 1 + Stage 2: a standalone, unit-tested C++17 library (`/engine`) with `StudentStore` and `RequestScheduler`, runnable via `ctest`, with no Node or database dependency. This is the part you defend in the evaluation, so it is built and proven first.

## Open questions to confirm

1. Priority scale 1 = highest, and only priority 1 goes to the priority_queue?
2. Urgent-first-then-FIFO merge order (accepting possible starvation)?
3. N-API addon vs child-process bridge?
4. Own JWT auth vs Supabase Auth?
5. Recommendation score formula (shared skills + interest bonus)?
6. Add `GET /requirements/mine`?
