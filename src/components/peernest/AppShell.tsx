import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Cpu, Inbox, LayoutDashboard, LogIn, LogOut, Menu, PlusCircle, Users, X } from "lucide-react";
import { Logo, Panel } from "./primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiConfigured, isUnauthorized, setToken } from "@/lib/api/client";
import { useBackendHealth, useCurrentStudent, type BackendState } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Directory", icon: Users },
  { to: "/collaborations/new", label: "New requirement", icon: PlusCircle },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/architecture", label: "DSA architecture", icon: Cpu },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground" }}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

const statusCopy: Record<BackendState, { dot: string; title: string; text: string }> = {
  unconfigured: { dot: "bg-highlight", title: "Backend not configured", text: "Sample preview only. Set VITE_PEERNEST_API_URL to connect." },
  checking: { dot: "bg-muted-foreground", title: "Checking backend…", text: "Contacting the API health check." },
  unreachable: { dot: "bg-destructive", title: "API unreachable", text: "The Node.js API did not respond." },
  "engine-down": { dot: "bg-warning", title: "C++ engine unavailable", text: "API is up, but the C++ worker is not responding." },
  healthy: { dot: "bg-success", title: "API + C++ engine healthy", text: "Live data via the Node.js API." },
};

function ApiStatus() {
  const state = useBackendHealth();
  const c = statusCopy[state];
  return (
    <div className="rounded-xl bg-sidebar-accent p-3 text-xs text-sidebar-foreground/80" role="status" aria-live="polite">
      <div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
        <span className={cn("size-2 rounded-full", c.dot)} />
        {c.title}
      </div>
      <p className="mt-1">{c.text}</p>
    </div>
  );
}

function SessionAction({ onDone }: { onDone?: (() => void) | undefined }) {
  const me = useCurrentStudent();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!isApiConfigured()) return null;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setToken(null); // JWT is stateless: removing it locally signs the user out
    onDone?.();
    navigate({ to: "/auth", replace: true });
  }

  if (me.data) {
    return (
      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <LogOut className="size-4" /> Sign out
        <span className="ml-auto truncate text-xs text-sidebar-foreground/60">{me.data.name}</span>
      </button>
    );
  }
  return (
    <Link to="/auth" onClick={onDone} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <LogIn className="size-4" /> Sign in
    </Link>
  );
}

function SidebarFooter({ onDone }: { onDone?: (() => void) | undefined }) {
  return (
    <div className="space-y-3">
      <SessionAction onDone={onDone} />
      <ApiStatus />
    </div>
  );
}

function SignInPrompt() {
  return (
    <Panel className="mx-auto mt-10 max-w-md text-center animate-rise">
      <h1 className="text-2xl font-semibold">Sign in to continue</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page shows your own PeerNest data, so you need to be signed in.</p>
      <Button asChild variant="hero" className="mt-6 w-full"><Link to="/auth"><LogIn /> Sign in or register</Link></Button>
    </Panel>
  );
}

/** Shows children when the backend is unconfigured (sample preview) or the session is valid. */
function AuthGate({ children }: { children: ReactNode }) {
  const me = useCurrentStudent();
  if (!isApiConfigured()) return <>{children}</>;
  if (me.isPending) return <Skeleton className="h-64 rounded-2xl" />;
  if (isUnauthorized(me.error)) return <SignInPrompt />;
  return <>{children}</>;
}

export function AppShell({ children, authRequired = true }: { children: ReactNode; authRequired?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-sidebar p-5 md:flex">
        <div className="space-y-8">
          <Logo className="text-sidebar-accent-foreground" />
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-muted">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-sidebar p-5 animate-in slide-in-from-left">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Logo className="text-sidebar-accent-foreground" />
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X className="size-5" /></button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter onDone={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-12">
        {authRequired ? <AuthGate>{children}</AuthGate> : children}
      </main>
    </div>
  );
}
