import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Handshake, PlusCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/peernest/AppShell";
import { Avatar, collabLabels, EmptyState, PageHeader } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { collaborationsApi } from "@/lib/api/endpoints";
import { isNotConfigured, useCurrentStudent, useRequirements } from "@/lib/api/hooks";
import type { RequirementPost } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requirements/")({
  validateSearch: (search: Record<string, unknown>): { mine?: boolean } =>
    search["mine"] === true || search["mine"] === "true" ? { mine: true } : {},
  head: () => ({
    meta: [
      { title: "Requirements Board · PeerNest" },
      { name: "description", content: "Browse student projects, hackathons and study opportunities, and connect with the requirement owner." },
      { property: "og:title", content: "Requirements Board · PeerNest" },
      { property: "og:description", content: "Find collaboration opportunities posted by PeerNest students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequirementsBoard,
});

function RequirementsBoard() {
  return <AppShell><BoardContent /></AppShell>;
}

function BoardContent() {
  const { mine = false } = Route.useSearch();
  const posts = useRequirements(mine);
  const me = useCurrentStudent();
  return (
    <>
      <PageHeader eyebrow="Collaborate" title="Requirements" emphasis="Board" description="Find your next project, team or study partner."
        actions={<Button asChild variant="hero"><Link to="/collaborations/new"><PlusCircle /> New requirement</Link></Button>} />
      <div className="mb-6 inline-flex gap-1 rounded-xl bg-muted p-1" aria-label="Filter requirements">
        <Button asChild variant={mine ? "ghost" : "secondary"} size="sm"><Link to="/requirements" search={{}}>All posts</Link></Button>
        <Button asChild variant={mine ? "secondary" : "ghost"} size="sm"><Link to="/requirements" search={{ mine: true }}>My posts</Link></Button>
      </div>
      {isNotConfigured(posts.error) ? (
        <EmptyState title="Backend not configured">Requirements will appear once the API is connected. No sample posts are shown.</EmptyState>
      ) : posts.isPending ? (
        <div className="grid gap-5 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-80 rounded-lg" />)}</div>
      ) : posts.error ? (
        <EmptyState title="Could not load requirements">
          <p>{posts.error instanceof Error ? posts.error.message : "The API did not respond. Please try again."}</p>
          <Button variant="outline" className="mt-4" onClick={() => void posts.refetch()}>Try again</Button>
        </EmptyState>
      ) : posts.data?.length === 0 ? (
        <EmptyState title={mine ? "You haven't posted any requirements yet" : "No requirements yet"}>
          <Button asChild variant="outline" className="mt-4"><Link to="/collaborations/new"><PlusCircle /> Create a requirement</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {posts.data?.map((post) => <RequirementCard key={post.id} post={post} own={post.owner.id === me.data?.id} canRespond={Boolean(me.data)} />)}
        </div>
      )}
    </>
  );
}

function deadlineLabel(deadline?: string) {
  if (!deadline) return "No deadline";
  const date = new Date(deadline.length === 10 ? `${deadline}T00:00:00` : deadline);
  return Number.isNaN(date.getTime()) ? deadline : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RequirementCard({ post, own, canRespond }: { post: RequirementPost; own: boolean; canRespond: boolean }) {
  const qc = useQueryClient();
  const interest = useMutation({
    mutationFn: () => collaborationsApi.sendRequest(post.owner.id, `Hi! I'm interested in collaborating on "${post.title}".`, { requirementId: post.id }),
    onSuccess: () => {
      toast.success("Interest sent to the requirement owner");
      void qc.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <article aria-label={post.title} className="flex min-w-0 flex-col gap-5 rounded-lg border bg-card p-5 shadow-soft animate-rise sm:p-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-primary">{collabLabels[post.type]}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", post.priority === 1 ? "bg-destructive/10 text-destructive" : post.priority === 2 ? "bg-warning/15 text-warning" : "bg-secondary text-secondary-foreground")}>
            {post.priority === 1 ? "High" : post.priority === 2 ? "Medium" : "Low"} · P{post.priority}
          </span>
        </div>
        <h2 className="break-words text-xl font-semibold">{post.title}</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{post.description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {post.requiredSkills.map((skill, index) => <span key={`${skill}-${index}`} className="max-w-full break-words rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{skill}</span>)}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><Users className="size-4" /> Team size: {post.teamSize}</span>
        <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> {deadlineLabel(post.deadline)}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={post.owner.name} />
          <div className="min-w-0"><p className="break-words text-sm font-semibold">{post.owner.name}</p><p className="break-words text-xs text-muted-foreground">{post.owner.department}</p></div>
        </div>
        {own ? <span className="text-sm font-medium text-primary">Your post</span> : (
          <Button variant="hero" disabled={!canRespond || interest.isPending || interest.isSuccess} onClick={() => interest.mutate()}>
            <Handshake /> {interest.isPending ? "Sending…" : interest.isSuccess ? "Interest sent" : "I'm interested"}
          </Button>
        )}
      </div>
    </article>
  );
}