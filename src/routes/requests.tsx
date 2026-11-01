import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/peernest/AppShell";
import { Avatar, BackendNotice, collabLabels, EmptyState, PageHeader, SampleTag } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { collaborationsApi } from "@/lib/api/endpoints";
import { isNotConfigured, useRequests } from "@/lib/api/hooks";
import type { RequestStatus } from "@/lib/api/types";
import { sampleRequests } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Collaboration requests · PeerNest" },
      { name: "description", content: "Review pending, accepted and rejected collaboration requests, ordered by priority." },
      { property: "og:title", content: "Collaboration requests · PeerNest" },
      { property: "og:description", content: "Pending, accepted and rejected requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Requests,
});

const tabs: RequestStatus[] = ["pending", "accepted", "rejected"];
const statusStyle: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning",
  accepted: "bg-success/12 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

function Requests() {
  const [tab, setTab] = useState<RequestStatus>("pending");
  const res = useRequests();
  const qc = useQueryClient();
  const offline = isNotConfigured(res.error);
  const all = offline ? sampleRequests : (res.data ?? []);
  const list = all.filter((r) => r.status === tab);

  async function respond(id: string, status: "accepted" | "rejected") {
    try {
      await collaborationsApi.respond(id, status);
      toast.success(`Request ${status}`);
      qc.invalidateQueries({ queryKey: ["requests"] });
    } catch (e) {
      toast.error(isNotConfigured(e) ? "Backend not connected — nothing was changed." : (e as Error).message);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Inbox" title="Collaboration requests" description="Pending requests are served in order from the C++ priority queue — highest priority first." />
      {offline && <BackendNotice what="request data" />}

      <div className="mb-6 inline-flex rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors", tab === t ? "bg-card shadow-soft" : "text-muted-foreground")}>
            {t} <span className="ml-1 font-mono text-xs text-muted-foreground">{all.filter((r) => r.status === t).length}</span>
          </button>
        ))}
      </div>

      {res.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title={`No ${tab} requests`} />
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft animate-rise sm:flex-row sm:items-center">
              <Avatar name={r.from.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.from.name}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", statusStyle[r.status])}>{r.status}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">P{r.priority}</span>
                  {offline && <SampleTag />}
                </div>
                <p className="text-sm text-foreground/80">{r.requirementTitle} · <span className="text-muted-foreground">{collabLabels[r.type]}</span></p>
                {r.message && <p className="mt-1 text-sm text-muted-foreground">“{r.message}”</p>}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => respond(r.id, "rejected")}><X /> Reject</Button>
                  <Button size="sm" variant="hero" onClick={() => respond(r.id, "accepted")}><Check /> Accept</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
