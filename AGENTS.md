## PeerNest architecture
- Repository layout: `src/` React/TanStack Start frontend, `/server` Node/Express + SQLite API (routes under `/api`), `/engine` C++17 library and JSON-lines `peernest_worker`.
- The C++ engine is the source of truth for search, recommendation and pending-request ordering; never reimplement these in TS or Node — the frontend reaches data only through `src/lib/api/`.
- Storage goes through the async repository in `server/src/db.js` (SQLite when DATABASE_PATH only, PostgreSQL when DATABASE_URL is set) so both adapters stay interchangeable; the database is the persistent store; for each search/recommend/order call the API sends a snapshot of current rows to the worker, which rebuilds StudentStore/RequestScheduler.
- Engine core is limited to vector, unordered_map, queue and priority_queue (approved proposal); Trie/Graph/AI are not implemented.
- When VITE_PEERNEST_API_URL is unset, pages show `BackendNotice` + clearly tagged samples from `src/lib/sample-data.ts`, and mutations report failure — never fake success.
- Requirements Board shows persisted posts only; requirement-linked requests must target the saved owner and inherit stored title/type/priority so the scheduler gets the authoritative priority.
- `vite.config.ts` is a plain TanStack Start + Nitro config (no platform wrapper) so the frontend builds anywhere; Nitro uses `vercel` on Vercel and `node-server` locally/elsewhere.
