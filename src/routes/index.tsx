import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, GitBranch, Inbox, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, SkillBadge, AvailabilityPill, Avatar } from "@/components/peernest/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PeerNest — Find your next student collaborator" },
      { name: "description", content: "PeerNest matches college students by skills for projects, hackathons, study groups and placement prep." },
      { property: "og:title", content: "PeerNest — Find your next student collaborator" },
      { property: "og:description", content: "Skill-based student matching powered by C++ data structures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Search, title: "Skill-indexed search", text: "Find peers by skill through a C++ hash-map skill index." },
  { icon: Sparkles, title: "Skill-based recommendations", text: "Ranked in C++ by shared skills plus a small bonus for shared interests." },
  { icon: Inbox, title: "Prioritised requests", text: "Incoming requests ordered by a priority queue so urgent ones surface first." },
  { icon: GitBranch, title: "Collaboration requirements", text: "Post what you need on the Requirements Board; interested students send a request to you." },
];

const uses = ["Project partners", "Hackathon teammates", "Study partners", "Placement preparation"];

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/students" className="hover:text-foreground">Directory</Link>
          <Link to="/architecture" className="hover:text-foreground">Architecture</Link>
          <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </nav>
        <div className="flex gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Log in</Link></Button>
          <Button asChild variant="ink"><Link to="/auth" search={{ mode: "register" }}>Get started</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Cpu className="size-3.5 text-primary" /> Student Skill & Collaboration Management · DSA in C++
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] md:text-6xl">
            Find the peers who <span className="text-gradient">complete your team.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            PeerNest helps students find project partners, hackathon teammates and study groups by searching each other's technical skills.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero"><Link to="/auth" search={{ mode: "register" }}>Create your profile <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/architecture">See the architecture</Link></Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {uses.map((u) => <span key={u} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{u}</span>)}
          </div>
        </div>

        <div className="relative animate-rise [animation-delay:150ms]">
          <div className="absolute inset-0 -z-10 rounded-[2rem] grid-dots opacity-60 md:-inset-6" />
          <div className="rounded-3xl border bg-card p-5 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Top matches for “C++, React”</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Illustration</span>
            </div>
            {[
              { n: "Aarav Mehta", d: "CSE · Year 3", s: [{ name: "C++", level: "advanced" as const }, { name: "Node.js", level: "intermediate" as const }], m: 21 },
              { n: "Diya Sharma", d: "IT · Year 2", s: [{ name: "React", level: "advanced" as const }, { name: "Figma", level: "advanced" as const }], m: 12 },
              { n: "Kabir Rao", d: "ECE · Year 4", s: [{ name: "Python", level: "advanced" as const }, { name: "C++", level: "beginner" as const }], m: 11 },
            ].map((r) => (
              <div key={r.n} className="flex items-center gap-3 border-t py-3 first:border-t-0">
                <Avatar name={r.n} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{r.n}</p>
                  <div className="mt-1 flex flex-wrap gap-1">{r.s.map((s) => <SkillBadge key={s.name} skill={s} />)}</div>
                </div>
                <span className="font-mono text-sm font-semibold text-primary">score {r.m}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted p-3 text-xs">
              <span className="text-muted-foreground">Ranked by C++ matching engine</span>
              <AvailabilityPill value="available" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Features</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">How the C++ data structures are used</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-10 text-ink-foreground md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Looking for a teammate?</h2>
            <p className="mt-2 text-ink-foreground/70">Create a profile with your skills, then search the directory.</p>
          </div>
          <Button asChild size="lg" variant="hero"><Link to="/students"><Users /> Browse the directory</Link></Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        PeerNest · Student Skill and Collaboration Management System Using Data Structures in C++
      </footer>
    </div>
  );
}
