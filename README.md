# PeerNest — Student Skill & Collaboration Management System Using Data Structures in C++

## Overview

PeerNest is our university DSA project. Students often find project partners, hackathon teammates or study groups through word of mouth and scattered chat groups. In PeerNest a student registers their skills and interests, searches other students by skill, gets recommendations based on shared skills, and sends collaboration requests with a priority.

Students can also post a requirement on the Requirements Board (for example "need a React developer for a hackathon"). Other students who see the post can click "I'm interested"; this sends a request to the post's owner, and the request takes the priority saved on the post. The owner then accepts or rejects it from their inbox.

The search, recommendation and request-ordering logic is written in C++17 using standard library data structures. The web frontend and the Node.js API only collect input, store data (SQLite locally, PostgreSQL when hosted) and display results.

## Implemented features

- Student registration and login (bcrypt-hashed passwords, JWT sessions, local sign-out)
- Student profile: department, year, skills, interests, availability, hours per week
- Student directory with skill search ("Match skills": any or all selected skills) and metadata filters
- Recommendations based on a deterministic scoring rule
- Create a collaboration requirement (title, type, required skills, team size, deadline, priority)
- Requirements Board: browse saved posts and send an "I'm interested" request to the owner
- Send collaboration requests with a priority (High / Medium / Low); recipient can accept or reject
- Pending requests ordered by the C++ request scheduler
- API / engine health indicator in the app sidebar

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, TanStack Start/Router, HTML, CSS (Tailwind) |
| API | Node.js + Express (zod validation, helmet, CORS, JWT) |
| Persistence | SQLite (better-sqlite3) locally; PostgreSQL (`pg`, e.g. Neon Free) when `DATABASE_URL` is set |
| DSA engine | C++17, built with CMake |
| Node ↔ C++ | Long-running JSON-lines worker process (`peernest_worker`, nlohmann/json) |

## Data structures used

All in `engine/` (C++17 standard library only for the core):

| Structure | Where | Purpose |
|---|---|---|
| `std::vector<Student>` | `StudentStore::students_` | Owns all student records |
| `std::unordered_map<std::string, size_t>` | `StudentStore::idIndex_` | Student ID → position in the vector (O(1) average lookup) |
| `std::unordered_map<std::string, std::vector<std::string>>` | `StudentStore::skillIndex_` | Normalized skill (trimmed, lowercase) → student IDs |
| `std::queue<Request>` | `RequestScheduler` | Normal requests, priority 2 (medium) and 3 (low), FIFO |
| `std::priority_queue<Request, std::vector<Request>, Comparator>` | `RequestScheduler` | Urgent requests, priority 1 (high) |

Skill searches use `skillIndex_`; the other filters (name/skill text `q`, department, year, availability, interest) scan the candidate students in the vector. Trie, graph and AI-based matching are **not** implemented.

### Recommendation score

```
score = 10 × (number of shared skills) + 1 × (number of shared interests)
```

Candidates are found through `skillIndex_`. Ties are broken by name, then ID. This is a simple deterministic heuristic, not machine learning or AI.

### Request ordering policy

- Priority 1 (High) → `priority_queue` (urgent).
- Priority 2 (Medium) and 3 (Low) → one FIFO `queue`. Low is not ordered separately from Medium.
- Pending list order: all urgent requests first; equal urgent priority is ordered by earlier arrival (sequence number); then normal requests in FIFO order.
- Listing copies the containers, so it does not consume the queues. Resolved requests are removed by lazy deletion.
- Limitation: normal requests can wait indefinitely (starvation) if urgent requests keep arriving.

## Architecture

```text
React frontend ──HTTP──> Express API (/api) ──> SQLite or PostgreSQL (persistent source of truth)
                                 │
                                 └─ JSON lines (stdin/stdout) ─> C++17 peernest_worker
                                       builds StudentStore / RequestScheduler
                                       from a DB snapshot, returns results
```

For each search, recommendation or pending-request listing, the API loads current rows from the database and sends them to the C++ worker, which rebuilds its structures and returns the result. Restarting the server therefore loses no state. This is suitable for the small dataset of this project; it could later be optimized by keeping the structures warm.

Repository layout:

```text
engine/   C++17 library, CLI demo, JSON-lines worker, tests (CMake)
server/   Express API, SQLite schema, engine bridge, API tests
src/      Frontend routes, components and typed API client (src/lib/api)
```

## Local setup

### Prerequisites (Windows, MSYS2 UCRT64)

The toolchain is expected at `C:\msys64\ucrt64\bin` (GCC, CMake, Ninja, GDB). Node.js 20+ is also required.

In PowerShell, add the toolchain to PATH for the session:

```powershell
$env:PATH = "C:\msys64\ucrt64\bin;$env:PATH"
```

In VS Code, the workspace files `.vscode/settings.json` and `.vscode/tasks.json` already do this. Use **Terminal → Run Task** with:
`Engine: configure`, `Engine: build`, `Engine: test`, `Engine: run demo`, `Server: install`, `Server: test`, `Server: dev`.

### 1. Build and test the C++ engine

```bash
cmake -S engine -B engine/build -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build engine/build
ctest --test-dir engine/build --output-on-failure
./engine/build/peernest_demo        # Windows: engine\build\peernest_demo.exe
```

### 2. Run the API

```bash
cd server
npm install
npm run build:engine   # builds the C++ worker via CMake
cp .env.example .env   # set JWT_SECRET etc.; never commit .env
npm run dev            # http://localhost:4000, routes under /api
npm test
```

Environment variables: `PORT`, `NODE_ENV`, `JWT_SECRET`, `DATABASE_PATH` (default `server/data/peernest.sqlite`, local SQLite mode), `DATABASE_URL` (PostgreSQL; overrides SQLite when set), `CORS_ORIGIN`, `PEERNEST_ENGINE_PATH`. See `server/README.md`.

### 3. Run the frontend

```bash
npm install
cp .env.frontend.example .env.local
npm run dev
```

`.env.local` contains `VITE_PEERNEST_API_URL=http://localhost:4000/api`. The value must be the API origin followed by `/api`. If it is not set, the frontend shows clearly labelled sample previews and does not pretend to save anything.

## Tests

| Component | Command |
|---|---|
| C++ engine | `ctest --test-dir engine/build --output-on-failure` |
| API | `cd server && npm test` |
| Frontend | `npx vitest run` |

## Deployment status

- **Frontend:** Vercel build configuration is prepared (`vite.config.ts` selects Nitro's `vercel` preset on Vercel; `vercel.json` sets the `tanstack-start` framework). The frontend has **not been deployed to Vercel yet**. Without `VITE_PEERNEST_API_URL` it runs in clearly labelled sample-preview mode.
- **Backend API:** **not deployed yet**. A `Dockerfile` and a Render blueprint (`render.yaml`: one **free** Docker web service, no disk) are prepared; there is no live API URL. The target cost is $0/month.
- **Persistence:** hosted data lives in a Neon Free PostgreSQL database (`DATABASE_URL`). Render's free filesystem is ephemeral, so SQLite is for local development only. Render free services sleep after 15 minutes idle and take about a minute to wake; Neon Free has limited storage and compute hours and scales to zero when idle. Fine for a college demo, not production-grade.
- **Not yet tested:** the PostgreSQL adapter has only been tested against an in-process emulator (`pg-mem`), not a real Neon database.
- **Remaining steps:**
  1. Create a Neon Free database and connect/authorize the repository in Vercel and Render.
  2. Deploy the API on Render (free plan); set `DATABASE_URL` in the Render dashboard (never commit it). `JWT_SECRET` is generated by the blueprint.
  3. Set the API's `CORS_ORIGIN` to the final Vercel domain.
  4. Set `VITE_PEERNEST_API_URL=https://<render-api-host>/api` in Vercel and deploy the frontend.
  5. Test the real workflow end to end (register, post a requirement, send interest, accept/reject).

## Known limitations

- Free hosting tiers: cold starts and limited database storage/compute
- No password reset or rate limiting yet
- Possible starvation of normal requests under continuous urgent traffic
- No Trie, graph or AI components
