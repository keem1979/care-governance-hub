"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardPenLine,
  FileCheck2,
  FileStack,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Menu,
  NotebookTabs,
  ScrollText,
  Settings,
  SlidersHorizontal,
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
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { GovernanceAssistant } from "@/components/governance-assistant";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

const primaryNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/my-work", label: "My Work", icon: ListChecks, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
  { href: "/management", label: "Management Command", icon: ChartNoAxesCombined, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
] as const;

const navigationGroups = [
  {
    key: "care",
    label: "People & Care",
    description: "People, plans and workforce",
    icon: HeartPulse,
    items: [
      { href: "/clients", label: "Client Directory", icon: ContactRound, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/care-plans", label: "Care Plans", icon: HeartPulse, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/care-assurance", label: "Care Assurance", icon: ShieldCheck, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT] },
      { href: "/workforce", label: "Workforce Compliance", icon: UserRoundCheck, anyOf: [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE] },
      { href: "/quality", label: "Care Quality", icon: HeartPulse, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
    ],
  },
  {
    key: "governance",
    label: "Governance & Assurance",
    description: "Controls, evidence and improvement",
    icon: ShieldCheck,
    items: [
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
    ],
  },
  {
    key: "oversight",
    label: "Oversight & Reporting",
    description: "Reviews, deadlines and outputs",
    icon: ChartNoAxesCombined,
    items: [
      { href: "/meetings", label: "Governance Meetings", icon: UsersRound, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/calendar", label: "Compliance Calendar", icon: CalendarDays, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/kpis", label: "KPI Suite", icon: ChartNoAxesCombined, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/inspection", label: "Inspection Centre", icon: FileCheck2, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/templates", label: "Templates", icon: FileStack, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/reports", label: "Reports", icon: ScrollText, anyOf: [PERMISSIONS.REPORTS_EXPORT] },
      { href: "/activity", label: "Activity Log", icon: Activity, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
    ],
  },
  {
    key: "intelligence",
    label: "Data & Intelligence",
    description: "Quality, connections and guidance",
    icon: PlugZap,
    items: [
      { href: "/data-quality", label: "Data Quality", icon: ScanSearch, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT] },
      { href: "/connected-governance", label: "Connected Governance", icon: PlugZap, anyOf: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ORGANISATION_MANAGE] },
      { href: "/abi-assurance", label: "Abi Assurance", icon: Bot, anyOf: [PERMISSIONS.GOVERNANCE_VIEW] },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    description: "Security, setup and launch",
    icon: Settings,
    items: [
      { href: "/security", label: "My Security", icon: KeyRound, anyOf: Object.values(PERMISSIONS) },
      { href: "/assurance", label: "Security & Integrations", icon: PlugZap, anyOf: [PERMISSIONS.ORGANISATION_MANAGE] },
      { href: "/implementation", label: "Implementation Centre", icon: SlidersHorizontal, anyOf: [PERMISSIONS.ORGANISATION_MANAGE] },
      { href: "/launch-readiness", label: "Launch Assurance", icon: FlaskConical, anyOf: [PERMISSIONS.ORGANISATION_MANAGE] },
      { href: "/settings", label: "Organisation Settings", icon: Settings, anyOf: [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE] },
    ],
  },
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
  "connected-governance": { source: "Approved integrations, staged imports, explicit source authority, quarantined events and reviewed offline observations", links: [{ href: "/data-quality", label: "Reconciliation queue" }, { href: "/offline-capture", label: "Offline capture" }, { href: "/activity?recordType=IntegrationConnection", label: "Connection history" }] },
  "abi-assurance": { source: "Audited Abi classifications, cited sources, feedback and management escalations", links: [{ href: "/activity?recordType=AssistantEscalation", label: "Escalation history" }, { href: "/assurance", label: "Security assurance" }, { href: "/inspection", label: "Inspection guidance" }] },
  implementation: { source: "Versioned tenant configuration, onboarding evidence, notification preferences and privacy-safe adoption metadata", links: [{ href: "/settings", label: "Organisation settings" }, { href: "/activity?recordType=ConfigurationPromotion", label: "Promotion history" }, { href: "/assurance", label: "Security assurance" }] },
  "launch-readiness": { source: "Controlled internal and external pilots, independently verified outcomes, service operations, commercial intent and benchmark consent", links: [{ href: "/implementation", label: "Implementation Centre" }, { href: "/assurance", label: "Security assurance" }, { href: "/activity?recordType=LaunchPilot", label: "Pilot history" }] },
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
  "my-work": { source: "Live records assigned to the signed-in user, ordered by target date and urgency", links: [{ href: "/actions", label: "Action Tracker" }, { href: "/calendar", label: "Compliance Calendar" }] },
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
  const [navQuery, setNavQuery] = useState("");
  const location = context.locations[0];
  const moduleKey = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const connections = moduleConnections[moduleKey];
  const canOpen = (anyOf: readonly string[]) => anyOf.some((permission) => context.permissions.includes(permission));
  const visiblePrimary = primaryNavigation.filter(({ anyOf }) => canOpen(anyOf));
  const visibleGroups = navigationGroups.map((group) => ({ ...group, items: group.items.filter(({ anyOf }) => canOpen(anyOf)) })).filter((group) => group.items.length > 0);
  const activeGroupKey = visibleGroups.find((group) => group.items.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)))?.key;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set([activeGroupKey ?? "care"]));
  const cleanNavQuery = navQuery.trim().toLowerCase();
  const displayedGroups = visibleGroups.map((group) => ({ ...group, items: cleanNavQuery ? group.items.filter((item) => `${item.label} ${group.label} ${group.description}`.toLowerCase().includes(cleanNavQuery)) : group.items })).filter((group) => group.items.length > 0);

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
    <div data-has-company-logo={Boolean(context.organisation.policyLogoStorageKey)} className="qcgms-app min-h-screen lg:grid lg:grid-cols-[304px_1fr]">
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[304px] max-w-[90vw] flex-col bg-brand-dark text-white shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:shadow-none ${
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
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <div className="relative mb-4">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/55" />
            <input
              type="search"
              value={navQuery}
              onChange={(event) => setNavQuery(event.target.value)}
              placeholder="Find a feature"
              aria-label="Find a feature"
              className="w-full rounded-xl border border-white/10 bg-white/8 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-emerald-100/45 focus:border-emerald-300/60 focus:bg-white/12 focus:ring-2 focus:ring-emerald-300/15"
            />
          </div>

          {!cleanNavQuery ? <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[.18em] text-emerald-100/45">Workspace</p> : null}
          <ul className="space-y-1">
            {visiblePrimary.filter((item) => !cleanNavQuery || item.label.toLowerCase().includes(cleanNavQuery)).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <li key={href}><Link href={href} prefetch={false} onMouseEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white text-brand-dark shadow-sm" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}><span className={`grid size-8 place-items-center rounded-lg ${active ? "bg-emerald-50 text-emerald-800" : "bg-white/6 text-emerald-100/75 group-hover:bg-white/10 group-hover:text-white"}`}><Icon aria-hidden="true" size={17} /></span><span className="min-w-0 flex-1 truncate">{label}</span>{active ? <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" /> : null}</Link></li>;
            })}
          </ul>

          <div className="mt-4 space-y-2">
            {displayedGroups.map((group) => {
              const GroupIcon = group.icon, containsActive = group.items.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)), expanded = cleanNavQuery ? true : expandedGroups.has(group.key) || containsActive;
              return <section key={group.key} className={`overflow-hidden rounded-2xl border transition ${containsActive ? "border-emerald-300/25 bg-white/7" : "border-white/7 bg-white/[.025]"}`} aria-labelledby={`nav-group-${group.key}`}>
                <button type="button" id={`nav-group-${group.key}`} aria-expanded={expanded} aria-controls={`nav-group-items-${group.key}`} onClick={() => toggleGroup(group.key)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/7 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-300">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${containsActive ? "bg-emerald-400 text-slate-950" : "bg-white/8 text-emerald-100"}`}><GroupIcon aria-hidden="true" size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-white">{group.label}</span><span className="mt-0.5 block truncate text-[10px] text-emerald-100/55">{group.description}</span></span>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black text-emerald-100/65">{group.items.length}</span>
                  {expanded ? <ChevronDown aria-hidden="true" size={15} className="text-emerald-100/55" /> : <ChevronRight aria-hidden="true" size={15} className="text-emerald-100/55" />}
                </button>
                {expanded ? <ul id={`nav-group-items-${group.key}`} className="space-y-1 border-t border-white/7 px-2 py-2">{group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return <li key={href}><Link href={href} prefetch={false} onMouseEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white font-bold text-brand-dark shadow-sm" : "text-emerald-50/75 hover:bg-white/10 hover:text-white"}`}><Icon aria-hidden="true" size={17} className={active ? "text-emerald-700" : "text-emerald-100/55 group-hover:text-white"} /><span className="min-w-0 flex-1 truncate">{label}</span>{active ? <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" /> : null}</Link></li>;
                })}</ul> : null}
              </section>;
            })}
          </div>
          {cleanNavQuery && displayedGroups.length === 0 && !visiblePrimary.some((item) => item.label.toLowerCase().includes(cleanNavQuery)) ? <p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-emerald-100/60">No accessible feature matches “{navQuery.trim()}”.</p> : null}
        </nav>
        <div className="border-t border-white/10 bg-white/[.025] p-4">
          <p className="truncate text-sm font-bold">{context.user.name}</p>
          <p className="mt-0.5 truncate text-xs text-emerald-100/65">
            {context.role.name}
            {context.accessMode === "READ_ONLY" ? " · Read only" : ""}
          </p>
          <button
            className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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
