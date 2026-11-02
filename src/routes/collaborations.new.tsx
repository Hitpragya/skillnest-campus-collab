import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/peernest/AppShell";
import { collabLabels, PageHeader, Panel } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collaborationsApi } from "@/lib/api/endpoints";
import { isNotConfigured } from "@/lib/api/hooks";
import type { CollaborationRequirement, CollaborationType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collaborations/new")({
  head: () => ({
    meta: [
      { title: "New collaboration requirement · PeerNest" },
      { name: "description", content: "Post the skills, team size and deadline you need for a project, hackathon or study group." },
      { property: "og:title", content: "New collaboration requirement · PeerNest" },
      { property: "og:description", content: "Post what you need and get matched." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRequirement,
});

function NewRequirement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<CollaborationType>("project");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [busy, setBusy] = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (skills.length === 0) {
      toast.error("Add at least one required skill.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const body: CollaborationRequirement = {
      title: String(f.get("title")),
      description: String(f.get("description")),
      type,
      requiredSkills: skills,
      teamSize: Number(f.get("teamSize")),
      deadline: String(f.get("deadline") || "") || undefined,
      priority,
    };
    setBusy(true);
    try {
      await collaborationsApi.createRequirement(body);
      await queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("Requirement posted");
      navigate({ to: "/requirements" });
    } catch (err) {
      toast.error(isNotConfigured(err) ? "Backend not connected — the requirement was not saved." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Collaborate" title="Create a collaboration" emphasis="requirement" description="Describe who you need and list the required skills. Your post appears on the Requirements Board, where other students can send you a request." />
      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-3">
        <Panel className="space-y-5 lg:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Smart India Hackathon — need a backend dev" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Collaboration type</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(collabLabels) as CollaborationType[]).map((k) => (
                <button type="button" key={k} onClick={() => setType(k)}
                  className={cn("rounded-xl border p-3 text-left text-sm font-medium transition-all", type === k ? "border-primary bg-accent text-accent-foreground shadow-soft" : "hover:border-primary/40")}>
                  {collabLabels[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required placeholder="What are you building and what will the collaborator do?" className="min-h-32" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill">Required skills</Label>
            <div className="flex gap-2">
              <Input id="skill" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" className="h-11" />
              <Button type="button" variant="outline" className="h-11" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {s}<button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="size-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="teamSize">Team size needed</Label>
              <Input id="teamSize" name="teamSize" type="number" min={1} max={10} defaultValue={2} required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input id="deadline" name="deadline" type="date" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((p) => (
                  <button type="button" key={p} onClick={() => setPriority(p)}
                    className={cn("rounded-lg border py-2 text-sm font-medium", priority === p ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40")}>
                    {p === 1 ? "High" : p === 2 ? "Medium" : "Low"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">High (1) is handled by the C++ priority_queue. Medium (2) and Low (3) share the FIFO queue in arrival order.</p>
            </div>
          </Panel>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{busy ? "Posting…" : "Post requirement"}</Button>
        </div>
      </form>
    </AppShell>
  );
}
