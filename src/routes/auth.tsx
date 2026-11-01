import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/peernest/primitives";
import { authApi } from "@/lib/api/endpoints";
import { setToken } from "@/lib/api/client";
import { isNotConfigured } from "@/lib/api/hooks";
import { collabLabels } from "@/components/peernest/primitives";
import type { Availability, CollaborationType, SkillLevel } from "@/lib/api/types";

type Mode = "login" | "register";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: s["mode"] === "register" ? "register" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in · PeerNest" },
      { name: "description", content: "Log in or create your PeerNest student profile." },
      { property: "og:title", content: "Sign in · PeerNest" },
      { property: "og:description", content: "Log in or create your PeerNest student profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const mode: Mode = search.mode ?? "login";
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const email = String(f.get("email"));
      const password = String(f.get("password"));
      const session =
        mode === "login"
          ? await authApi.login({ email, password })
          : await authApi.register({
              email,
              password,
              name: String(f.get("name")),
              department: String(f.get("department")),
              year: Number(f.get("year")),
              skills: String(f.get("skills"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => ({ name, level: "intermediate" as SkillLevel })),
              interests: f.getAll("interests").map(String) as CollaborationType[],
              availability: (String(f.get("availability") || "available")) as Availability,
            });
      setToken(session.token);
      toast.success(mode === "login" ? "Welcome back!" : "Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(isNotConfigured(err) ? "Backend not connected — no account was created or signed in." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground md:flex">
        <Logo className="text-ink-foreground" />
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Your skills are the index.<br /><span className="text-gradient">Your team is the result.</span></h2>
          <p className="mt-4 max-w-sm text-ink-foreground/70">Add your skills once — PeerNest's C++ engine indexes them so the right collaborators can find you.</p>
        </div>
        <p className="text-xs text-ink-foreground/50">Student Skill and Collaboration Management System</p>
      </div>

      <div className="flex items-center justify-center bg-hero px-5 py-12">
        <div className="w-full max-w-md animate-rise">
          <Logo className="mb-8 md:hidden" />
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
            {(["login", "register"] as const).map((m) => (
              <Link key={m} to="/auth" search={{ mode: m === "register" ? "register" : undefined }}
                className={`rounded-lg py-2 text-center transition-colors ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
                {m === "login" ? "Log in" : "Register"}
              </Link>
            ))}
          </div>
          <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your student profile"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Log in with your college email." : "Tell us who you are and what you build."}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <Field label="Full name" name="name" placeholder="Aarav Mehta" />
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Department" name="department" placeholder="Computer Science" />
                  <Field label="Year" name="year" type="number" min={1} max={6} placeholder="3" />
                </div>
                <Field label="Skills (comma separated)" name="skills" placeholder="C++, React, SQL" />
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Open to (optional)</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(collabLabels) as CollaborationType[]).map((k) => (
                      <label key={k} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                        <input type="checkbox" name="interests" value={k} className="accent-primary" />
                        {collabLabels[k]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="space-y-1.5">
                  <Label htmlFor="availability">Availability</Label>
                  <select id="availability" name="availability" defaultValue="available" className="h-11 w-full rounded-md border bg-card px-3 text-sm">
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>
              </>
            )}
            <Field label="College email" name="email" type="email" placeholder="you@college.edu" />
            <Field label="Password" name="password" type="password" minLength={8} placeholder="••••••••" />
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required className="h-11 bg-card" {...rest} />
    </div>
  );
}
