# PeerNest C++17 DSA Engine

C++17 library + JSON-lines worker used by the Node.js API in `/server`. The core library has no third-party dependencies; the worker uses the vendored single header nlohmann/json v3.11.3 (`third_party/nlohmann`, MIT), so builds need no network.

> **Frontend note:** the web app's Architecture page (`src/routes/architecture.tsx`) describes exactly
> the structures implemented here; Trie and graph structures are not part of this engine.

## Build

Standard CMake (Linux/macOS/Windows):
```bash
cmake -S engine -B engine/build
cmake --build engine/build
ctest --test-dir engine/build --output-on-failure
./engine/build/peernest_demo
```

Windows, MSYS2 **UCRT64** shell:
```bash
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-ninja
cmake -S engine -B engine/build -G Ninja
cmake --build engine/build
ctest --test-dir engine/build --output-on-failure
./engine/build/peernest_demo.exe
```

Targets: `peernest_core` (library), `peernest_demo` (CLI walkthrough), `peernest_tests`, `peernest_protocol` + `peernest_worker` (JSON-lines process for Node), `peernest_protocol_tests`. Both test executables are registered with CTest.
Warnings: `/W4` on MSVC, `-Wall -Wextra -Wpedantic` on GCC/Clang.

## Layout
```text
include/peernest/  student.h, student_store.h, request.h, request_scheduler.h
src/               student_store.cpp, request_scheduler.cpp
cli/main.cpp       deterministic demo
server/            protocol.cpp (JSON <-> classes, no DSA logic), main.cpp (stdin/stdout loop)
third_party/       nlohmann/json.hpp
tests/             test_main.cpp (core), test_protocol.cpp (filters + worker protocol)
```

## Data structures and responsibilities

| Structure | Member | Responsibility |
|---|---|---|
| `std::vector<Student>` | `StudentStore::students_` | Owns every student record. |
| `std::unordered_map<std::string, std::size_t>` | `StudentStore::idIndex_` | Student id -> position in the vector. |
| `std::unordered_map<std::string, std::vector<std::string>>` | `StudentStore::skillIndex_` | Normalized skill -> ids of students with it. |
| `std::queue<Request>` | `RequestScheduler::normal_` | Priority 2 and 3 requests, strict FIFO. |
| `std::priority_queue<Request, std::vector<Request>, UrgentComparator>` | `RequestScheduler::urgent_` | Priority 1 requests. |

`std::unordered_set` is used only as bookkeeping (dedupe, resolved/pending ids); `std::sort` is used for result ordering.

## Complexity (n students, k = students per skill, m requests)

| Operation | Average cost |
|---|---|
| `addStudent` | O(s) for s skills |
| `getStudentById` | O(1) lookup + copy |
| `updateStudent` | O(s · k) (remove id from old skill lists, add to new) |
| `removeStudent` | O(s · k); vector removal is O(1) swap-with-last |
| `searchBySkills` | O(q · k + r log r) for q query skills, r results |
| `recommendStudents` | O(s · k + c log c) for c candidates |
| `submit` | O(log m) urgent, O(1) normal |
| `resolveRequest` | O(1) (lazy), occasional O(m log m) compaction |
| `listPending` | O(m log m) on copies |
| `searchStudents` | skill filter via index as above, otherwise O(n) vector scan; + O(r log r) sort |

## Policies

- **Skill normalization:** trim whitespace + lowercase; duplicates and empty skills dropped. Stored skills are the normalized form. Interests are normalized the same way.
- **Recommendation score:** `score = 10 × sharedSkills + 1 × sharedInterests`. Candidates come only from `skillIndex_` (at least one shared skill); the student themself is excluded. Order: score desc, then name asc, then id asc. This is a deterministic rule, not AI and not a graph.
- **Request routing:** priority 1 -> priority_queue; priorities 2 and 3 -> FIFO queue (3 is a label only; it does not reorder).
- **Pending order:** all urgent first (lower priority number, then lower sequence), then normal in arrival order. Normal requests can wait behind a stream of urgent ones (accepted limitation).
- **Sequence:** assigned by the scheduler, starting at 1, strictly increasing.
- **Lazy deletion:** `resolveRequest` removes the id from the pending set; queues are cleaned on read and compacted when more than half of the stored entries are resolved.
- **Validation:** empty ids, duplicate ids (including resolved ones) and priority outside 1..3 throw `std::invalid_argument`.
- **Lifetime:** all getters return copies; nothing points into the vector, which can reorder on removal.

## Worker protocol (`peernest_worker`)

One JSON object per line in, one per line out. Errors return `{"ok":false,"error":"..."}` and the process keeps running.

| action | input | output `data` |
|---|---|---|
| `ping` | – | `"pong"` |
| `searchStudents` | `students[]`, `filters{q,skills,mode:any\|all,department,year,availability,interest}` | `Student[]` sorted name, id |
| `recommendStudents` | `students[]`, `studentId`, `limit` | `[{student, score, sharedSkills}]` |
| `orderRequests` | `requests[]` in ascending persisted sequence | `[{id, priority, sequence, queue:"urgent"\|"normal"}]` |

Student JSON: `{id,name,department,year,skills:[string],interests:[string],availability,hoursPerWeek}`.
Each call builds a fresh `StudentStore` / `RequestScheduler` from the snapshot (see `/server/README.md`).
`q` matches a case-insensitive substring of the name or of any (normalized) skill.

## Current limits

- In-memory only; persistence lives in SQLite in the Node.js API, which sends snapshots per call.
- Not thread-safe; the API must serialize calls.
- One scheduler instance = one inbox; per-recipient inboxes will be a map of schedulers in the API layer.
- Worker is single-threaded; Node serialises calls.
