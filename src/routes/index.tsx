import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, GitBranch, Inbox, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, SkillBadge, Avatar } from "@/components/peernest/primitives";

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
  { icon: Search, title: "Search by skill", text: "Look up students by skill. The C++ engine uses a hash-map index from each skill to student IDs." },
  { icon: Sparkles, title: "Suggested teammates", text: "Ranked by a fixed score: 10 per shared skill plus 1 per shared interest." },
  { icon: Inbox, title: "Request inbox", text: "High-priority requests come first (priority_queue); Medium and Low wait in FIFO order." },
  { icon: GitBranch, title: "Requirements Board", text: "Post what your team needs. Interested students send a request to you." },
];

const example = [
  { n: "Aarav Mehta", s: [{ name: "C++", level: "advanced" as const }, { name: "Node.js", level: "intermediate" as const }], m: 21 },
  { n: "Diya Sharma", s: [{ name: "React", level: "advanced" as const }, { name: "Figma", level: "advanced" as const }], m: 12 },
  { n: "Kabir Rao", s: [{ name: "Python", level: "advanced" as const }, { name: "C++", level: "beginner" as const }], m: 11 },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/students" className="hover:text-foreground">Directory</Link>
            <Link to="/requirements" className="hover:text-foreground">Requirements</Link>
            <Link to="/architecture" className="hover:text-foreground">Architecture</Link>
          </nav>
          <Button asChild variant="outline" size="sm"><Link to="/auth">Log in</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Cpu className="size-4 text-primary" /> Student Skill & Collaboration Management · DSA in C++</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] md:text-6xl">Find students to work with on projects, hackathons and <em className="font-serif font-normal italic text-primary">study groups.</em></h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Create a profile with your skills and interests, search the student directory, post a requirement for your team, and send or answer collaboration requests.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero"><Link to="/auth" search={{ mode: "register" }}>Create profile <ArrowRight /></Link></Button>
            <Button asChild variant="outline"><Link to="/auth">Log in</Link></Button>
            <Button asChild variant="ghost"><Link to="/students"><Users /> Explore directory</Link></Button>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-elevated">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Matches for “C++, React”</p>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">Example only</span>
          </div>
          {example.map((r) => (
            <div key={r.n} className="flex items-center gap-3 border-t py-3 first:border-t-0">
              <Avatar name={r.n} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.n}</p>
                <div className="mt-1 flex flex-wrap gap-1">{r.s.map((s) => <SkillBadge key={s.name} skill={s} />)}</div>
              </div>
              <span className="font-mono text-sm text-primary-glow">score {r.m}</span>
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Made-up names showing how results look. Real results come from the C++ engine.</p>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-xl font-semibold">What you can do</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border bg-card p-5">
                <Icon className="size-5 text-primary-glow" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        PeerNest · Student Skill and Collaboration Management System Using Data Structures in C++
      </footer>
    </div>
  );
}
