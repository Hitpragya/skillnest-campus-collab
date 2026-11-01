import type { ReactNode } from "react";
import { PlugZap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Availability, CollaborationType, Skill, Student } from "@/lib/api/types";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-lg font-semibold", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
          <path d="M8.2 11 15.8 7M8.2 13l7.6 4" />
        </svg>
      </span>
      PeerNest
    </Link>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-rise">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-6 shadow-soft", className)}>{children}</div>;
}

export function BackendNotice({ what = "data" }: { what?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-dashed border-highlight/50 bg-highlight/5 p-4 text-sm">
      <PlugZap className="mt-0.5 size-4 shrink-0 text-highlight" />
      <p>
        <span className="font-semibold">Backend not connected.</span>{" "}
        <span className="text-muted-foreground">
          Live {what} comes from the C++ engine via the Node.js API. Showing a clearly labelled sample preview — nothing here is saved.
        </span>
      </p>
    </div>
  );
}

export function SampleTag() {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample preview</span>;
}

export function SkillBadge({ skill }: { skill: Skill }) {
  const dots = { beginner: 1, intermediate: 2, advanced: 3 }[skill.level];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {skill.name}
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("size-1 rounded-full", i <= dots ? "bg-primary" : "bg-border")} />
        ))}
      </span>
    </span>
  );
}

const availabilityStyle: Record<Availability, string> = {
  available: "bg-success/12 text-success",
  limited: "bg-warning/15 text-warning",
  busy: "bg-destructive/10 text-destructive",
};

export function AvailabilityPill({ value }: { value: Availability }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", availabilityStyle[value])}>
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

export const collabLabels: Record<CollaborationType, string> = {
  project: "Project partner",
  hackathon: "Hackathon teammate",
  study: "Study partner",
  placement: "Placement prep",
};

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl bg-accent font-display font-semibold text-accent-foreground", size === "lg" ? "size-20 text-2xl" : "size-11 text-sm")}>
      {initials}
    </span>
  );
}

export function StudentCard({ student, score, sample }: { student: Student; score?: number; sample?: boolean }) {
  return (
    <Link
      to="/students/$id"
      params={{ id: student.id }}
      className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-start gap-3">
        <Avatar name={student.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold group-hover:text-primary">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.department} · Year {student.year}</p>
        </div>
        {score !== undefined && (
          <span className="rounded-lg bg-gradient-primary px-2 py-1 font-mono text-xs font-semibold text-primary-foreground" title="Match score: 10 × shared skills + 1 × shared interests">score {score}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {student.skills.slice(0, 3).map((s) => <SkillBadge key={s.name} skill={s} />)}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <AvailabilityPill value={student.availability} />
        {sample && <SampleTag />}
      </div>
    </Link>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <p className="font-display font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
