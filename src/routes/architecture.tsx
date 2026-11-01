import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/peernest/AppShell";
import { PageHeader, Panel } from "@/components/peernest/primitives";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "DSA Architecture · PeerNest" },
      { name: "description", content: "How PeerNest uses hash maps, tries, graphs and priority queues in C++ to index and match students." },
      { property: "og:title", content: "DSA Architecture · PeerNest" },
      { property: "og:description", content: "The C++ data structures behind PeerNest." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Architecture,
});

const structures = [
  { name: "Hash Map", cpp: "std::unordered_map<std::string, std::vector<StudentId>>", role: "Skill → students index for O(1) average exact skill lookup.", ops: "Insert O(1) · Lookup O(1) avg", used: "Directory filters, matching candidates" },
  { name: "Trie", cpp: "struct TrieNode { std::array<TrieNode*, 128> next; std::vector<StudentId> ids; }", role: "Prefix search on skill names and student names (e.g. “rea” → React).", ops: "Search O(L) where L = prefix length", used: "Directory search box, autocomplete" },
  { name: "Weighted Graph", cpp: "std::unordered_map<StudentId, std::vector<std::pair<StudentId, double>>>", role: "Students are nodes; edge weight = skill overlap + interest match + availability.", ops: "Top-K neighbours via sorted adjacency", used: "Dashboard recommendations" },
  { name: "Priority Queue (Max-Heap)", cpp: "std::priority_queue<Request, std::vector<Request>, ByPriority>", role: "Orders incoming collaboration requests by priority, then timestamp.", ops: "Push O(log n) · Pop O(log n)", used: "Requests inbox ordering" },
  { name: "Doubly Linked List / Vector", cpp: "std::vector<Student>", role: "Primary contiguous storage for student records referenced by ID.", ops: "Access O(1) by index", used: "Profile fetch" },
];

function Architecture() {
  return (
    <AppShell>
      <PageHeader eyebrow="Architecture" title="Data structures behind PeerNest" description="The core algorithms are implemented in C++ and exposed through a Node.js API. This frontend only renders results — it does not reimplement any of them." />

      <div className="mb-6 rounded-xl border border-dashed border-highlight/50 bg-highlight/5 p-4 text-sm">
        <span className="font-semibold">Implementation status:</span>{" "}
        <span className="text-muted-foreground">This page documents the planned design. The C++ engine and Node.js API are built separately and are not part of this frontend.</span>
      </div>

      <Panel className="mb-8 overflow-x-auto">
        <p className="mb-4 text-sm font-semibold">Request flow</p>
        <div className="flex min-w-[640px] items-center gap-3 font-mono text-xs">
          {["React UI", "Node.js API (REST)", "C++ addon / process", "DSA engine"].map((s, i, a) => (
            <div key={s} className="flex flex-1 items-center gap-3">
              <div className={`flex-1 rounded-xl border p-4 text-center ${i === a.length - 1 ? "bg-ink text-ink-foreground" : "bg-secondary text-secondary-foreground"}`}>{s}</div>
              {i < a.length - 1 && <span className="text-primary">→</span>}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        {structures.map((s) => (
          <Panel key={s.name} className="animate-rise">
            <h3 className="text-lg font-semibold">{s.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.role}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs text-ink-foreground">{s.cpp}</pre>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="font-semibold uppercase tracking-wider text-muted-foreground">Complexity</dt><dd className="mt-1">{s.ops}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wider text-muted-foreground">Used by</dt><dd className="mt-1">{s.used}</dd></div>
            </dl>
          </Panel>
        ))}
      </div>

      <Panel className="mt-8">
        <h3 className="text-lg font-semibold">API contract</h3>
        <p className="mt-1 text-sm text-muted-foreground">Endpoints the frontend expects. Set <code className="font-mono">VITE_PEERNEST_API_URL</code> to connect.</p>
        <div className="mt-4 divide-y font-mono text-xs">
          {[
            ["POST", "/auth/register", "Create student"],
            ["POST", "/auth/login", "Returns { token, student }"],
            ["GET", "/students?q&skills&availability&interest", "Trie + hash map search"],
            ["GET", "/students/:id", "Student profile"],
            ["GET", "/students/me/recommendations", "Graph-based matches"],
            ["POST", "/requirements", "Create requirement"],
            ["GET", "/requests?status", "Priority-queue ordered"],
            ["POST", "/requests", "Send request"],
            ["PATCH", "/requests/:id", "Accept / reject"],
          ].map(([m, p, d]) => (
            <div key={p + m} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="w-14 font-semibold text-primary">{m ?? ""}</span>
              <span className="flex-1">{p}</span>
              <span className="font-sans text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
