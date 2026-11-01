# PeerNest API (Node.js + Express + SQLite)

```text
Browser (React frontend)  --HTTPS + JWT-->  Express API (/api)  --SQL-->  SQLite (source of truth)
                                                 |
                                                 | JSON lines over stdin/stdout
                                                 v
                                      peernest_worker (C++17 engine)
```

- **SQLite** stores students, requirements and requests.
- **C++ engine** performs skill search, recommendation scoring and pending-request ordering.
  Node contains no search/score/ordering logic: it loads rows, sends a snapshot, and re-attaches
  full records (skill levels etc.) to the IDs the engine returns, in the engine's order.
- **Snapshot per call:** each search/recommendation/order call rebuilds `StudentStore` /
  `RequestScheduler` from current SQLite rows. A restart therefore cannot lose DSA state. This is
  fine for a class-sized dataset (hundreds of students); a later optimisation could keep the
  engine warm and send incremental updates.
- Calls to the worker are serialised (one in flight). If the worker crashes it is restarted on the
  next call; if it is missing or fails, the API returns `503 engine_unavailable` — never fake data.

## Routes (all under `/api`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /health | no | `{api, engine}`; 503 if engine down |
| POST | /auth/register | no | bcrypt hash; returns `{token, student}` |
| POST | /auth/login | no | |
| GET | /auth/me | JWT | includes own email |
| GET | /students | JWT | `q, skills (comma list), mode=any\|all, department, year, availability, interest` → C++ `searchStudents` |
| GET | /students/me/recommendations | JWT | C++ `recommendStudents`, limit 10 |
| GET | /students/:id | JWT | no email |
| POST | /requirements | JWT | |
| GET | /requests | JWT | `status?`, `box=incoming(default)\|outgoing`. Pending ordered by C++; accepted/rejected newest first. No status = pending, then accepted, then rejected |
| POST | /requests | JWT | `{toStudentId, message?, requirementId?, priority?}`; requirement must be the sender's and supplies title/type/priority; default title "Collaboration request", priority 2, type "project" |
| PATCH | /requests/:id | JWT | `{status: accepted\|rejected}`; recipient only (403), pending only (409) |

Errors: `{ "error": { "code": "...", "message": "..." } }`.
Frontend: set `VITE_PEERNEST_API_URL=http://localhost:4000/api` (note the `/api`).

## Decisions

- Direct requests without a requirement get type `project` (the DB requires a type).
- Students registered through the current form get `availability = available` and no interests.
- Request IDs are UUIDs; the SQLite `sequence` (autoincrement) is the arrival order sent to C++.
- JWT (HS256) expires after 7 days. `JWT_SECRET` is mandatory (≥ 32 chars) when `NODE_ENV=production`;
  locally a clearly named development-only secret is used with a warning.
- CORS allows only `CORS_ORIGIN` (default `http://localhost:8080,http://localhost:5173`).

## Local run

Standard shell (Linux/macOS):
```bash
cd server
npm install
npm run build:engine          # CMake configure + build + ctest for ../engine
cp .env.example .env          # optional; edit values
npm run dev                   # http://localhost:4000/api/health
npm test
```

Windows, MSYS2 **UCRT64** shell (Node.js for Windows installed and on PATH):
```bash
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-ninja
cd server
npm install
npm run build:engine -- -G Ninja
npm run dev
```
If the worker cannot find MinGW DLLs when started from Node, either run Node from the UCRT64
shell or set `PEERNEST_ENGINE_PATH` to the built `.exe` with `C:\msys64\ucrt64\bin` on `PATH`.

`npm run dev` loads environment variables from your shell; export them or use
`node --env-file=.env src/index.js`.

## Deployment (prepared, not deployed)

- `Dockerfile` (repo root) builds the engine (and runs its tests) then the API in one container.
- `render.yaml` describes one Render web service with a 1 GB persistent disk at `/data`.
- **SQLite needs a persistent volume and exactly one instance.** Without a disk, data is lost on redeploy.
- Still required from you: a hosting account, setting `CORS_ORIGIN` to the frontend URL,
  then setting `VITE_PEERNEST_API_URL=https://<your-api-host>/api` for the frontend.

## Limits

- No rate limiting or password reset yet.
- No `GET /requirements/mine`; the frontend profile page still sends direct requests (priority 2).
- Snapshot-per-call costs O(n) per request; fine for small datasets only.
