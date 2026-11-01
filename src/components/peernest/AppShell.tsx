import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Cpu, Inbox, LayoutDashboard, Menu, PlusCircle, Users, X } from "lucide-react";
import { Logo } from "./primitives";
import { isApiConfigured } from "@/lib/api/client";
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

function ApiStatus() {
  const ok = isApiConfigured();
  return (
    <div className="rounded-xl bg-sidebar-accent p-3 text-xs text-sidebar-foreground/80">
      <div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
        <span className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-highlight")} />
        {ok ? "C++ engine connected" : "Engine not connected"}
      </div>
      <p className="mt-1">{ok ? "Live data via Node.js API." : "Set VITE_PEERNEST_API_URL to connect."}</p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-sidebar p-5 md:flex">
        <div className="space-y-8">
          <Logo className="text-sidebar-accent-foreground" />
          <NavLinks />
        </div>
        <ApiStatus />
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
            <ApiStatus />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
