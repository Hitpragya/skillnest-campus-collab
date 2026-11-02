import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/peernest/AppShell";
import { collabLabels, EmptyState, PageHeader, Panel } from "@/components/peernest/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/lib/api/endpoints";
import { isNotConfigured, useCurrentStudent } from "@/lib/api/hooks";
import type { Availability, CollaborationType, ProfileUpdate } from "@/lib/api/types";

export const Route = createFileRoute("/profile")({ component: ProfileEditor });

function ProfileEditor() {
  const me = useCurrentStudent();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState("");
  useEffect(() => { if (me.data) setSkills(me.data.skills.map((s) => s.name).join(", ")); }, [me.data]);

  if (me.isPending) return <AppShell><p className="text-muted-foreground">Loading your profile…</p></AppShell>;
  if (!me.data || isNotConfigured(me.error)) return <AppShell><EmptyState title="Profile editing needs the backend">Connect the API and sign in to edit your saved profile.</EmptyState></AppShell>;
  const student = me.data;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const names = skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const duplicate = new Set(names.map((skill) => skill.toLocaleLowerCase())).size !== names.length;
    if (duplicate) return toast.error("Each skill should appear only once.");
    const body: ProfileUpdate = {
      name: String(form.get("name")), department: String(form.get("department")), year: Number(form.get("year")),
      skills: names.map((name) => ({ name, level: "intermediate" })),
      interests: form.getAll("interests") as CollaborationType[],
      availability: String(form.get("availability")) as Availability,
      bio: String(form.get("bio") || "") || null,
      hoursPerWeek: form.get("hoursPerWeek") === "" ? null : Number(form.get("hoursPerWeek")),
    };
    setBusy(true);
    try {
      const updated = await authApi.updateProfile(body);
      qc.setQueryData(["me"], updated);
      await Promise.all([qc.invalidateQueries({ queryKey: ["students"] }), qc.invalidateQueries({ queryKey: ["recommendations"] })]);
      toast.success("Profile saved");
      navigate({ to: "/dashboard" });
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  return <AppShell><PageHeader eyebrow="Profile" title="Edit your profile" description="Keep your skills and availability current so the directory and recommendations stay useful." />
    <form onSubmit={save} className="grid max-w-3xl gap-5">
      <Panel className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" defaultValue={student.name} />
        <Field label="Department" name="department" defaultValue={student.department} />
        <Field label="Year" name="year" type="number" min={1} max={6} defaultValue={student.year} />
        <Field label="Hours per week" name="hoursPerWeek" type="number" min={0} max={80} defaultValue={student.hoursPerWeek} />
        <div className="sm:col-span-2"><Field label="Skills (comma separated)" name="skills" value={skills} onChange={(event) => setSkills(event.target.value)} /></div>
        <div className="sm:col-span-2 space-y-1.5"><Label htmlFor="bio">Short bio</Label><Textarea id="bio" name="bio" maxLength={500} defaultValue={student.bio} placeholder="What do you like building?" /></div>
        <div className="space-y-1.5"><Label htmlFor="availability">Availability</Label><select id="availability" name="availability" defaultValue={student.availability} className="h-10 w-full rounded-md border bg-card px-3 text-sm"><option value="available">Available</option><option value="limited">Limited</option><option value="busy">Busy</option></select></div>
      </Panel>
      <Panel><p className="text-sm font-medium">Open to</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{(Object.keys(collabLabels) as CollaborationType[]).map((interest) => <label key={interest} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" name="interests" value={interest} defaultChecked={student.interests.includes(interest)} className="accent-primary" />{collabLabels[interest]}</label>)}</div></Panel>
      <Button type="submit" variant="hero" size="lg" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
    </form>
  </AppShell>;
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required className="h-10" {...props} /></div>;
}
