import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/peernest/AppShell";
import { BackendNotice, collabLabels, EmptyState, PageHeader, StudentCard } from "@/components/peernest/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isNotConfigured, useStudentSearch } from "@/lib/api/hooks";
import type { Availability, CollaborationType, StudentSearchQuery } from "@/lib/api/types";
import { sampleStudents } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Student Directory · PeerNest" },
      { name: "description", content: "Search students by skill, department, availability and collaboration interest." },
      { property: "og:title", content: "Student Directory · PeerNest" },
      { property: "og:description", content: "Skill-based student search." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Directory,
});

const popularSkills = ["C++", "Python", "React", "Java", "DSA", "Node.js", "AWS", "Figma"];

function Directory() {
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability | "">("");
  const [interest, setInterest] = useState<CollaborationType | "">("");
  const [mode, setMode] = useState<"any" | "all">("any");

  const query: StudentSearchQuery = { q, skills, availability: availability || undefined, interest: interest || undefined, mode };
  const res = useStudentSearch(query);
  const offline = isNotConfigured(res.error);
  // Offline: show the unfiltered sample so layout can be previewed. Filtering is the C++ engine's job.
  const students = useMemo(() => (offline ? sampleStudents : (res.data ?? [])), [offline, res.data]);

  const toggle = (s: string) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <AppShell>
      <PageHeader eyebrow="Directory" title="Find students" emphasis="by skill" description="Skills are looked up in the C++ hash-map skill index; name, availability and interest filters scan the student vector." />
      {offline && <BackendNotice what="search results" />}

      <div className="mb-6 space-y-4 rounded-lg border bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or skill text, e.g. “rea”" className="h-11 pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {popularSkills.map((s) => (
            <button key={s} onClick={() => toggle(s)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", skills.includes(s) ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}>
              {s}
            </button>
          ))}
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Match skills
            <select value={mode} onChange={(e) => setMode(e.target.value as "any" | "all")} className="h-10 rounded-md border bg-card px-3 text-sm text-foreground">
              <option value="any">Any selected skill</option>
              <option value="all">All selected skills</option>
            </select>
          </label>
          <select value={availability} onChange={(e) => setAvailability(e.target.value as Availability | "")} className="h-10 rounded-md border bg-card px-3 text-sm">
            <option value="">Any availability</option>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="busy">Busy</option>
          </select>
          <select value={interest} onChange={(e) => setInterest(e.target.value as CollaborationType | "")} className="h-10 rounded-md border bg-card px-3 text-sm">
            <option value="">Any collaboration type</option>
            {Object.entries(collabLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {offline && (skills.length > 0 || q || availability || interest) && (
          <p className="text-xs text-muted-foreground">Filters will be applied by the backend once connected — the sample below is not filtered.</p>
        )}
      </div>

      {res.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
      ) : students.length === 0 ? (
        <EmptyState title="No students match these filters">Try removing a skill or widening availability.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => <StudentCard key={s.id} student={s} sample={offline} />)}
        </div>
      )}
    </AppShell>
  );
}
