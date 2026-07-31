"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Menu,
  NotebookTabs,
  ScrollText,
  Settings,
  ShieldEllipsis,
  SignpostBig,
  UsersRound,
  UserRoundCheck,
  HeartPulse,
  PlugZap,
  X,
} from "lucide-react";
import { useState } from "react";
import { GovernanceAssistant } from "@/components/governance-assistant";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/policies", label: "Policies", icon: BookOpenCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/evidence", label: "Evidence Library", icon: FolderOpen, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD] },
  { href: "/audits", label: "Audit Centre", icon: ClipboardCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE] },
  { href: "/registers", label: "Registers", icon: NotebookTabs, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/risks", label: "Risk Register", icon: ShieldEllipsis, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/actions", label: "Action Tracker", icon: ListChecks, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/workforce", label: "Workforce Compliance", icon: UserRoundCheck, anyOf: [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE] },
  { href: "/quality", label: "Care Quality", icon: HeartPulse, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/meetings", label: "Governance Meetings", icon: UsersRound, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/calendar", label: "Compliance Calendar", icon: CalendarDays, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/kpis", label: "KPI Suite", icon: ChartNoAxesCombined, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/inspection", label: "Inspection Centre", icon: FileCheck2, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/templates", label: "Templates", icon: FileStack, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/reports", label: "Reports", icon: ScrollText, anyOf: [PERMISSIONS.REPORTS_EXPORT] },
  { href: "/activity", label: "Activity Log", icon: Activity, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/assurance", label: "Security & Integrations", icon: PlugZap, anyOf: [PERMISSIONS.ORGANISATION_MANAGE] },
  { href: "/settings", label: "Settings", icon: Settings, anyOf: [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE] },
] as const;

export function AppShell({
  context,
  children,
}: {
  context: AuthorisedContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const location = context.locations[0];

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[276px_1fr]">
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col bg-brand-dark text-white transition-transform lg:sticky lg:top-0 lg:h-screen ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex min-h-24 items-center justify-between border-b border-white/10 px-4 py-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 font-semibold">
            <Image
              src="/atom-logo.png"
              alt="ATOM"
              width={64}
              height={64}
              priority
              unoptimized
              className="size-16 shrink-0 rounded-xl bg-white object-contain"
            />
            <span className="min-w-0 leading-tight">
              <span className="block text-base">QCGMS</span>
              <span className="mt-1 block text-xs font-medium text-emerald-100/70">
                Hub
              </span>
            </span>
          </Link>
          <button
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          <ul className="space-y-1">
            {navigation
              .filter(({ anyOf }) =>
                anyOf.some((permission) =>
                  context.permissions.includes(permission),
                ),
              )
              .map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    onMouseEnter={() => router.prefetch(href)}
                    onFocus={() => router.prefetch(href)}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-white text-brand-dark shadow-sm"
                        : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon aria-hidden="true" size={18} />
                    {label}
                  </Link>
                </li>
              );
              })}
          </ul>
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{context.user.name}</p>
          <p className="mt-0.5 truncate text-xs text-emerald-100/65">
            {context.role.name}
            {context.accessMode === "READ_ONLY" ? " · Read only" : ""}
          </p>
          <button
            className="mt-3 text-xs font-semibold text-emerald-100 underline-offset-4 hover:underline disabled:opacity-50"
            onClick={signOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg border border-border p-2 text-brand-dark lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden="true" size={21} />
            </button>
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-sm font-semibold text-brand-dark transition hover:border-emerald-300 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-3"
              type="button"
              onClick={goBack}
              aria-label="Back to previous page"
              title="Back to previous page"
            >
              <ArrowLeft aria-hidden="true" size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {context.organisation.name}
              </p>
              {context.organisation.isDemo ? (
                <p className="text-xs text-muted">Fictional demonstration data</p>
              ) : null}
            </div>
          </div>
          <button
            className="flex max-w-[46%] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm"
            type="button"
            aria-label="Current service location"
            title="Location switching will be enabled when multiple locations are configured."
          >
            <SignpostBig className="shrink-0 text-brand" size={17} />
            <span className="truncate">{location?.name ?? "All locations"}</span>
            <ChevronDown className="shrink-0 text-muted" size={15} />
          </button>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <GovernanceAssistant />
    </div>
  );
}
