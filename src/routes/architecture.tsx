import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/peernest/AppShell";
import { PageHeader, Panel } from "@/components/peernest/primitives";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "DSA Architecture · PeerNest" },
      { name: "description", content: "How PeerNest uses std::vector, std::unordered_map, std::queue and std::priority_queue in a C++17 engine to search students and order requests." },
      { property: "og:title", content: "DSA Architecture · PeerNest" },
      { property: "og:description", content: "The four C++17 data structures behind PeerNest." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Architecture,
});

const structures = [
  {
    name: "Vector — student records",
    cpp: "std::vector<Student> students_;",
    role: "Owns every student record in memory. Removal swaps the last record into the gap, then pops it.",
    ops: "Access by index O(1) · Remove O(1) swap-with-last · Full scan O(n)",
    used: "Metadata filters (q, department, year, availability, interest), profile copies",
  },
  {
    name: "Hash map — ID index",
    cpp: "std::unordered_map<std::string, std::size_t> idIndex_;",
    role: "Maps a student ID to its position in the vector. Updated when a removal moves a record.",
    ops: "Lookup / insert / erase O(1) average",
    used: "getStudentById, re-attaching search results",
  },
  {
    name: "Hash map — skill index",
    cpp: "std::unordered_map<std::string, std::vector<std::string>> skillIndex_;",
    role: "Maps a normalized skill (trimmed, lowercase) to the IDs of students who have it. Old skills are removed on update.",
    ops: "Skill lookup O(1) average · Search O(q·k + r log r)",
    used: "Skill search (any / all), recommendation candidates",
  },
  {
    name: "Queue — normal requests",
    cpp: "std::queue<Request> normal_;",
    role: "Medium (2) and Low (3) requests in strict arrival order (FIFO). Low is a label only — it is not ordered separately.",
    ops: "Push O(1) · Pop O(1)",
    used: "Pending inbox, after urgent requests",
  },
  {
    name: "Priority queue — urgent requests",
    cpp: "std::priority_queue<Request, std::vector<Request>, UrgentComparator> urgent_;",
    role: "High (1) requests. The comparator serves the lower priority number first, then the earlier arrival sequence.",
    ops: "Push O(log m) · Pop O(log m)",
    used: "Pending inbox, served first",
  },
];

const complexity = [
  ["addStudent", "O(s) for s skills"],
  ["getStudentById", "O(1) lookup + copy"],
  ["updateStudent / removeStudent", "O(s · k) — k = students per skill"],
  ["searchBySkills", "O(q · k + r log r)"],
  ["searchStudents", "skill filter via index, otherwise O(n) scan; + O(r log r) sort"],
  ["recommendStudents", "O(s · k + c log c) for c candidates"],
  ["submit request", "O(log m) urgent · O(1) normal"],
  ["resolveRequest", "O(1) lazy deletion; occasional O(m log m) compaction"],
  ["listPending", "O(m log m) on copies — queues are not modified"],
];

function Flow({ steps }: { steps: { label: string; note: string; dark?: boolean }[] }) {
  return (
    <div className="flex min-w-[720px] items-stretch gap-3 font-mono text-xs">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-center gap-3">
          <div className={`flex-1 rounded-xl border p-4 text-center ${s.dark ? "bg-ink text-ink-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <p className="font-semibold">{s.label}</p>
            <p className="mt-1 font-sans text-[11px] opacity-75">{s.note}</p>
          </div>
          {i < steps.length - 1 && <span className="text-primary">→</span>}
        </div>
      ))}
    </div>
  );
}

function Architecture() {
  return (
    <AppShell authRequired={false}>
      <PageHeader eyebrow="Architecture" title="Data structures behind PeerNest" description="Search, recommendations and request ordering run in a C++17 engine. The frontend only displays results — it does not reimplement any of them." />

      <div className="mb-6 rounded-xl border border-dashed border-highlight/50 bg-highlight/5 p-4 text-sm">
        <span className="font-semibold">Implemented core:</span>{" "}
        <span className="text-muted-foreground">exactly four C++ STL structures — std::vector, std::unordered_map, std::queue and std::priority_queue. No Trie, no graph and no AI model are used.</span>
      </div>

      <Panel className="mb-8 overflow-x-auto">
        <p className="mb-4 text-sm font-semibold">Request and data flow</p>
        <Flow steps={[
          { label: "React frontend", note: "Sends request with JWT" },
          { label: "Express /api", note: "Auth, validation, ownership checks" },
          { label: "SQLite", note: "Persistent source of truth" },
          { label: "C++17 worker", note: "Builds structures from a snapshot", dark: true },
          { label: "Results", note: "Ordered IDs → full records" },
        ]} />
        <div className="mt-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p><span className="font-semibold text-foreground">SQLite = persistence.</span> Students, requirements and requests are stored on disk. Nothing important lives only in memory.</p>
          <p><span className="font-semibold text-foreground">C++ structures = operations.</span> For each search, recommendation or inbox call, the API sends current rows to the worker, which rebuilds the indexes and scheduler and returns the result. A restart cannot lose state.</p>
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

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel>
          <h3 className="text-lg font-semibold">Search and recommendations</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Skill filters use the <code className="font-mono">skillIndex_</code> hash map (any or all of the chosen skills).</li>
            <li>Name / skill text (<code className="font-mono">q</code>), department, year, availability and interest are checked by scanning the vector or the skill candidates.</li>
            <li>Results are sorted by name, then ID.</li>
            <li>Recommendation score = <span className="font-mono text-foreground">10 × shared skills + 1 × shared interests</span>. Ties go by name, then ID. It is a fixed, repeatable rule — not AI.</li>
          </ul>
        </Panel>
        <Panel>
          <h3 className="text-lg font-semibold">Request ordering policy</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li><span className="font-semibold text-foreground">High (1)</span> → priority_queue.</li>
            <li><span className="font-semibold text-foreground">Medium (2)</span> and <span className="font-semibold text-foreground">Low (3)</span> → one FIFO queue, in arrival order.</li>
            <li>Pending order: all urgent first (earlier arrival wins among equal priority), then normal requests in FIFO order.</li>
            <li>Normal requests may wait if urgent requests keep arriving.</li>
            <li>Accepted / rejected requests come from SQLite, newest first.</li>
          </ul>
        </Panel>
      </div>

      <Panel className="mt-8">
        <h3 className="text-lg font-semibold">Complexity summary</h3>
        <p className="mt-1 text-sm text-muted-foreground">n students, s skills per student, k students per skill, q query skills, r results, m requests.</p>
        <div className="mt-4 divide-y font-mono text-xs">
          {complexity.map(([op, cost]) => (
            <div key={op} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="flex-1 font-semibold">{op}</span>
              <span className="font-sans text-muted-foreground">{cost}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-8">
        <h3 className="text-lg font-semibold">API contract</h3>
        <p className="mt-1 text-sm text-muted-foreground">All routes live under <code className="font-mono">/api</code>, so <code className="font-mono">VITE_PEERNEST_API_URL</code> must end in <code className="font-mono">/api</code>.</p>
        <div className="mt-4 divide-y font-mono text-xs">
          {[
            ["GET", "/health", "API and C++ engine status"],
            ["POST", "/auth/register", "Create student"],
            ["POST", "/auth/login", "Returns { token, student }"],
            ["GET", "/auth/me", "Signed-in student"],
            ["GET", "/students?q&skills&department&year&availability&interest", "C++ skill index + vector scan"],
            ["GET", "/students/:id", "Student profile (no email)"],
            ["GET", "/students/me/recommendations", "C++ score: 10 × skills + 1 × interests"],
            ["POST", "/requirements", "Create requirement"],
            ["GET", "/requests?status", "Pending ordered by C++ scheduler"],
            ["POST", "/requests", "Send request (priority 1–3)"],
            ["PATCH", "/requests/:id", "Accept / reject (recipient only)"],
          ].map(([m, p, d]) => (
            <div key={`${m}${p}`} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="w-14 font-semibold text-primary">{m ?? ""}</span>
              <span className="min-w-0 flex-1 break-words">{p}</span>
              <span className="font-sans text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-8">
        <h3 className="text-lg font-semibold">Current limitations</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>SQLite supports one server instance and needs a persistent disk in production.</li>
          <li>No Trie (no prefix index) and no graph — text search is a linear substring scan.</li>
          <li>No AI or machine-learning model.</li>
          <li>No password reset and no rate limiting yet.</li>
          <li>Each call rebuilds structures from a snapshot — fine for a class-sized dataset.</li>
        </ul>
      </Panel>
    </AppShell>
  );
}
