<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## PeerNest architecture
- Frontend only; all data goes through `src/lib/api/` (client, endpoints, hooks, types) to an external Node.js API wrapping a C++ DSA engine — never implement matching/indexing/priority algorithms in TS, since the C++ engine is the source of truth.
- When the API URL (VITE_PEERNEST_API_URL) is unset, pages show `BackendNotice` + clearly tagged sample data from `src/lib/sample-data.ts`, and mutations report failure — never fake success.
- C++17 DSA engine lives in `/engine` (CMake, no third-party deps); core is limited to vector, unordered_map, queue, priority_queue per the approved proposal — Trie/Graph are not implemented.
- Backend lives in `/server` (Express + better-sqlite3, routes under `/api`); SQLite is the persistent source of truth, and every search/recommend/order call sends a snapshot to the C++ `peernest_worker` over JSON lines — Node must not reimplement those algorithms.
