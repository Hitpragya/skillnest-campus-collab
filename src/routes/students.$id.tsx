import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/peernest/AppShell";
import { AvailabilityPill, Avatar, BackendNotice, collabLabels, EmptyState, Panel, SampleTag, SkillBadge } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { collaborationsApi } from "@/lib/api/endpoints";
import { isNotConfigured, useStudent } from "@/lib/api/hooks";
import { sampleStudents } from "@/lib/sample-data";

export const Route = createFileRoute("/students/$id")({
  head: () => ({
    meta: [
      { title: "Student profile · PeerNest" },
      { name: "description", content: "Skills, availability and collaboration interests of a PeerNest student." },
      { property: "og:title", content: "Student profile · PeerNest" },
      { property: "og:description", content: "Skills and availability on PeerNest." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const res = useStudent(id);
  const offline = isNotConfigured(res.error);
  const student = offline ? sampleStudents.find((s) => s.id === id) : res.data;
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await collaborationsApi.sendRequest(id, msg);
      toast.success("Request sent");
      setMsg("");
    } catch (e) {
      toast.error(isNotConfigured(e) ? "Backend not connected — the request was not sent." : (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <Link to="/students" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Directory</Link>
      {offline && <BackendNotice what="profile data" />}
      {res.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !student ? (
        <EmptyState title="Student not found" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2 animate-rise">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={student.name} size="lg" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{student.name}</h1>
                  {offline && <SampleTag />}
                </div>
                <p className="text-muted-foreground">{student.department} · Year {student.year}</p>
              </div>
              <AvailabilityPill value={student.availability} />
            </div>
            {student.bio && <p className="mt-6 text-foreground/80">{student.bio}</p>}

            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">{student.skills.map((s) => <SkillBadge key={s.name} skill={s} />)}</div>

            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Open to</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {student.interests.map((i) => <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{collabLabels[i]}</span>)}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel>
              <p className="text-sm font-semibold">Availability</p>
              <div className="mt-3 flex items-center gap-2 text-2xl font-display font-semibold">
                <Clock className="size-5 text-primary" /> {student.hoursPerWeek ?? "—"} <span className="text-sm font-normal text-muted-foreground">hrs / week</span>
              </div>
            </Panel>
            <Panel>
              <p className="text-sm font-semibold">Send a collaboration request</p>
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hi! I'm building…" className="mt-3 min-h-28" />
              <Button onClick={send} disabled={sending || !msg.trim()} variant="hero" className="mt-3 w-full"><Send /> {sending ? "Sending…" : "Send request"}</Button>
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}
