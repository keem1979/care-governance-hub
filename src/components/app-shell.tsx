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
  ClipboardPenLine,
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
  ContactRound,
  UserRoundCheck,
  HeartPulse,
  ShieldCheck,
  KeyRound,
  PlugZap,
  ScanSearch,
  Workflow,
  Landmark,
  X,
} from "lucide-react";
import { useState } from "react";
import { GovernanceAssistant } from "@/components/governance-assistant";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/management", label: "Management Command", icon: ChartNoAxesCombined, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/clients", label: "Client Directory", icon: ContactRound, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/care-plans", label: "Care Plans", icon: HeartPulse, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/care-assurance", label: "Care Assurance", icon: ShieldCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/policies", label: "Policies", icon: BookOpenCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/evidence", label: "Evidence Library", icon: FolderOpen, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD] },
  { href: "/evidence-assurance", label: "Evidence Assurance", icon: FileCheck2, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/audits", label: "Audit Centre", icon: ClipboardCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE] },
  { href: "/assessments", label: "Assessment Centre", icon: ClipboardPenLine, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/registers", label: "Registers", icon: NotebookTabs, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/risks", label: "Risk Register", icon: ShieldEllipsis, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/actions", label: "Action Tracker", icon: ListChecks, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/improvement", label: "Improvement Assurance", icon: Workflow, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE] },
  { href: "/governance-control", label: "Governance Control", icon: Landmark, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/workforce", label: "Workforce Compliance", icon: UserRoundCheck, anyOf: [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE] },
  { href: "/quality", label: "Care Quality", icon: HeartPulse, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/data-quality", label: "Data Quality", icon: ScanSearch, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/meetings", label: "Governance Meetings", icon: UsersRound, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/calendar", label: "Compliance Calendar", icon: CalendarDays, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/kpis", label: "KPI Suite", icon: ChartNoAxesCombined, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/inspection", label: "Inspection Centre", icon: FileCheck2, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/templates", label: "Templates", icon: FileStack, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
  { href: "/reports", label: "Reports", icon: ScrollText, anyOf: [PERMISSIONS.REPORTS_EXPORT] },
  { href: "/activity", label: "Activity Log", icon: Activity, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
  { href: "/security", label: "My Security", icon: KeyRound, anyOf: Object.values(PERMISSIONS) },
  { href: "/assurance", label: "Security & Integrations", icon: PlugZap, anyOf: [PERMISSIONS.ORGANISATION_MANAGE] },
  { href: "/settings", label: "Settings", icon: Settings, anyOf: [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE] },
] as const;

const moduleConnections: Record<string, {
  source: string;
  links: { href: string; label: string }[];
}> = {
  clients: { source: "Controlled client profiles linked to assessments, reviews, incidents and evidence", links: [{ href: "/assessments", label: "Start assessment" }, { href: "/registers/care-plan-reviews", label: "Care-plan reviews" }, { href: "/evidence", label: "Linked evidence" }] },
  "care-plans": { source: "Live person-centred care instructions, controlled versions, review proposals, evidence, actions and staff acknowledgement", links: [{ href: "/registers/care-plan-reviews", label: "Care-plan reviews" }, { href: "/actions", label: "Follow-up actions" }, { href: "/evidence", label: "Linked evidence" }] },
  "care-assurance": { source: "Approved current care instructions, assigned staff, acknowledgements, understanding checks and verified workforce records", links: [{ href: "/care-plans", label: "Controlled care plans" }, { href: "/workforce", label: "Workforce evidence" }, { href: "/activity?recordType=CarePlan", label: "Care-plan history" }] },
  policies: { source: "Controlled policy records, approvals, review dates and document versions", links: [{ href: "/reports/policy-compliance", label: "Policy report" }, { href: "/inspection", label: "Inspection evidence" }, { href: "/activity?recordType=Policy", label: "Policy activity" }] },
  evidence: { source: "Uploaded evidence, template copies and linked module records", links: [{ href: "/reports/evidence-index", label: "Evidence report" }, { href: "/inspection", label: "Inspection links" }, { href: "/audits", label: "Audit evidence" }] },
  "evidence-assurance": { source: "Evidence provenance, current-version verification, suitability mappings, controlled framework changes and mock-inspection samples", links: [{ href: "/evidence", label: "Evidence Library" }, { href: "/inspection", label: "Inspection Centre" }, { href: "/activity?recordType=EvidenceVerification", label: "Verification history" }] },
  audits: { source: "Completed audit forms, responses, findings and scores", links: [{ href: "/reports/audit", label: "Audit report" }, { href: "/actions", label: "Improvement actions" }, { href: "/inspection", label: "Inspection evidence" }] },
  assessments: { source: "Initial, consent, person-centred and service-impact assessment records", links: [{ href: "/evidence", label: "Assessment evidence" }, { href: "/risks", label: "Escalated risks" }, { href: "/quality", label: "Care quality" }] },
  registers: { source: "Operational events entered by managers and authorised staff", links: [{ href: "/kpis", label: "Synced KPIs" }, { href: "/actions", label: "Follow-up actions" }, { href: "/reports", label: "Register reports" }] },
  risks: { source: "Scored risks, controls, owners and review history", links: [{ href: "/reports/risk", label: "Risk report" }, { href: "/actions", label: "Risk actions" }, { href: "/dashboard", label: "Dashboard alerts" }] },
  actions: { source: "Actions raised from audits, risks, registers, meetings and manual entry", links: [{ href: "/reports/action-status", label: "Action report" }, { href: "/calendar", label: "Due dates" }, { href: "/dashboard", label: "Dashboard alerts" }] },
  improvement: { source: "Canonical findings, causes, actions, evidence, independent verification, effectiveness and recurrence", links: [{ href: "/actions", label: "Action Tracker" }, { href: "/evidence", label: "Evidence" }, { href: "/reports/action-status", label: "Improvement report" }] },
  "governance-control": { source: "Approved meeting decisions, commissioner obligations, external responses, evidence and linked action delays", links: [{ href: "/meetings", label: "Source meetings" }, { href: "/calendar", label: "Unified deadlines" }, { href: "/activity?recordType=GovernanceObligation", label: "Obligation history" }] },
  workforce: { source: "Staff records, checks, training, supervision and competency outcomes", links: [{ href: "/calendar", label: "Expiry calendar" }, { href: "/kpis", label: "Workforce KPIs" }, { href: "/inspection", label: "Inspection evidence" }] },
  quality: { source: "Live oversight drawn from assessments, operational registers, KPIs and improvement actions—without duplicate entry", links: [{ href: "/kpis", label: "Quality KPIs" }, { href: "/inspection", label: "Inspection evidence" }, { href: "/reports/quality-assurance", label: "Quality report" }] },
  "data-quality": { source: "Potential identity matches and material-change dependencies requiring human review", links: [{ href: "/clients", label: "Client records" }, { href: "/care-plans", label: "Care plans" }, { href: "/activity?recordType=DataQuality", label: "Review history" }] },
  meetings: { source: "Agendas, attendance, decisions, approved minutes and linked actions", links: [{ href: "/actions", label: "Meeting actions" }, { href: "/calendar", label: "Meeting dates" }, { href: "/reports/monthly-governance", label: "Governance report" }] },
  calendar: { source: "Manual deadlines plus policy, workforce and governance due dates", links: [{ href: "/policies", label: "Policy reviews" }, { href: "/workforce", label: "Workforce checks" }, { href: "/dashboard", label: "Upcoming deadlines" }] },
  kpis: { source: "Registers, actions, workforce, audits, policies and verified manager figures", links: [{ href: "/kpis/returns", label: "Return history" }, { href: "/reports/kpi", label: "KPI report" }, { href: "/dashboard", label: "Dashboard summary" }] },
  inspection: { source: "Evidence, policies, audits, actions and operational register links", links: [{ href: "/inspection/pack", label: "Inspection pack" }, { href: "/reports/inspection-readiness", label: "Readiness report" }, { href: "/evidence", label: "Evidence Library" }] },
  templates: { source: "Published starter templates and organisation-owned controlled templates", links: [{ href: "/evidence", label: "Create evidence" }, { href: "/audits", label: "Audit forms" }, { href: "/activity?recordType=Template", label: "Template activity" }] },
  reports: { source: "Live authorised records from every governance module", links: [{ href: "/dashboard", label: "Dashboard" }, { href: "/activity", label: "Audit trail" }] },
  activity: { source: "Immutable create, update, approval, export and access events", links: [{ href: "/reports", label: "Reports" }, { href: "/assurance", label: "Security assurance" }] },
  security: { source: "Multi-factor authentication, recovery codes and active-session control", links: [{ href: "/activity", label: "Account activity" }, { href: "/assurance", label: "Security assurance" }] },
  assurance: { source: "Settings, access controls, audit history and security evidence", links: [{ href: "/settings", label: "Access settings" }, { href: "/activity", label: "Audit trail" }, { href: "/evidence", label: "Security evidence" }] },
  settings: { source: "Organisation structure, locations, licences, users and permissions", links: [{ href: "/activity", label: "Permission history" }, { href: "/assurance", label: "Security readiness" }] },
  dashboard: { source: "Live alerts and summaries from all QCGMS modules", links: [{ href: "/reports/monthly-governance", label: "Governance report" }, { href: "/activity", label: "Recent activity" }] },
  management: { source: "Live actions, risks, external dependencies and assurance decisions within your authorised scope", links: [{ href: "/actions", label: "Action Tracker" }, { href: "/improvement", label: "Improvement Assurance" }, { href: "/activity?recordType=ManagementDelegation", label: "Delegation history" }] },
};

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
  const moduleKey = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const connections = moduleConnections[moduleKey];

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
    <div data-has-company-logo={Boolean(context.organisation.policyLogoStorageKey)} className="qcgms-app min-h-screen lg:grid lg:grid-cols-[276px_1fr]">
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
              src="/atom-wordmark.png"
              alt="ATOM"
              width={120}
              height={45}
              priority
              unoptimized
              className="h-auto w-28 shrink-0 object-contain"
            />
            <span className="min-w-0 leading-tight">
              <span className="block text-base">QCGMS</span>
              <span className="mt-1 block text-xs font-medium text-emerald-100/70">
                Assurance Hub
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
            {context.organisation.policyLogoStorageKey ? (
              <Image
                src="/api/settings/policy-branding/logo"
                alt={`${context.organisation.name} logo`}
                width={48}
                height={48}
                unoptimized
                className="size-12 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1"
              />
            ) : null}
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
        {connections ? (
          <section className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-3 sm:px-6 lg:px-8" aria-label="Module data and related views">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-emerald-950"><strong>Data source:</strong> {connections.source}</p>
              <nav className="flex flex-wrap gap-2" aria-label="Related module views">
                {connections.links.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:border-emerald-400">{item.label}</Link>)}
              </nav>
            </div>
          </section>
        ) : null}
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <GovernanceAssistant />
    </div>
  );
}
