import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Inbox, PlusCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/peernest/AppShell";
import { AvailabilityPill, BackendNotice, EmptyState, PageHeader, Panel, SampleTag, SkillBadge, StudentCard } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isNotConfigured, useCurrentStudent, useRecommendations, useRequests } from "@/lib/api/hooks";
import { sampleRecommendations, sampleRequests } from "@/lib/sample-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · PeerNest" },
      { name: "description", content: "Your PeerNest profile, recommended collaborators and request activity." },
      { property: "og:title", content: "Dashboard · PeerNest" },
      { property: "og:description", content: "Your profile and recommended collaborators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = useCurrentStudent();
  const recs = useRecommendations();
  const reqs = useRequests();
  const offline = isNotConfigured(recs.error);
  const recommendations = offline ? sampleRecommendations : (recs.data ?? []);
  const requests = isNotConfigured(reqs.error) ? sampleRequests : (reqs.data ?? []);
  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <AppShell>
      <PageHeader eyebrow="Dashboard" title={me.data ? `Welcome, ${me.data.name.split(" ")[0]}` : "Welcome to PeerNest"} description="Your profile, the people the matching engine recommends, and what's waiting in your inbox."
        actions={<><Button asChild variant="outline"><Link to="/requirements">Browse opportunities <ArrowRight /></Link></Button><Button asChild variant="hero"><Link to="/collaborations/new"><PlusCircle /> New requirement</Link></Button></>} />
      {offline && <BackendNotice what="profile and recommendation data" />}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your profile</p>
            {offline && <SampleTag />}
          </div>
          {offline ? (
            <div className="mt-4 text-sm text-muted-foreground">
              Sign in once the backend is connected to see your profile here.
              <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/auth">Log in</Link></Button>
            </div>
          ) : me.isPending ? (
            <Skeleton className="mt-4 h-24 rounded-xl" />
          ) : me.data ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="font-display text-lg font-semibold">{me.data.name}</p>
                <p className="text-sm text-muted-foreground">{me.data.department} · Year {me.data.year}</p>
              </div>
              <AvailabilityPill value={me.data.availability} />
              <div className="flex flex-wrap gap-1.5">
                {me.data.skills.length === 0 ? <span className="text-sm text-muted-foreground">No skills added yet.</span> : me.data.skills.map((s) => <SkillBadge key={s.name} skill={s} />)}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Your profile could not be loaded.</p>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-5 lg:col-span-2">
          <Stat label="Recommended matches" value={recs.isLoading ? "—" : recommendations.length} icon={<Sparkles />} sample={offline} />
          <Stat label="Pending requests" value={reqs.isLoading ? "—" : pending} icon={<Inbox />} sample={isNotConfigured(reqs.error)} />
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recommended students</h2>
          <Link to="/students" className="flex items-center gap-1 text-sm font-medium text-primary">Browse all <ArrowRight className="size-4" /></Link>
        </div>
        {recs.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
        ) : recommendations.length === 0 ? (
          <EmptyState title="No recommendations yet">Add more skills to your profile to improve matching.</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((r) => <StudentCard key={r.student.id} student={r.student} score={r.matchScore} sample={offline} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value, icon, sample }: { label: string; value: number | string; icon: React.ReactNode; sample?: boolean }) {
  return (
    <Panel>
      <div className="flex items-center justify-between text-primary [&_svg]:size-5">{icon}{sample && <SampleTag />}</div>
      <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Panel>
  );
}
