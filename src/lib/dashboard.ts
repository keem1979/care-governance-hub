import {
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  HeartHandshake,
  ListTodo,
  ShieldAlert,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type DashboardSummary = {
  label: string;
  href: string;
  icon: LucideIcon;
  value: number | null;
  qualifier: string;
};

export type DashboardModule = {
  name: string;
  href: string;
  status: "ready" | "no-data";
  description: string;
};

export function reportingMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

export function dashboardSummaries(counts?: { policiesDue: number; overdueAudits: number; trainingEvidenceExpiring: number; documentsExpiring: number; openComplaints:number; openSafeguarding:number; incidentsAwaitingReview:number; risksOverdueReview:number; openHighRiskActions:number; overdueActions:number; governanceMeetingsDue:number }): DashboardSummary[] {
  return [
    {
      label: "Policies due for review",
      href: "/policies",
      icon: BookOpenCheck,
      value: counts?.policiesDue ?? null,
      qualifier: counts ? "Approved policies due or overdue" : "Policy data unavailable",
    },
    {
      label: "Overdue audits",
      href: "/audits",
      icon: ClipboardCheck,
      value: counts?.overdueAudits ?? null,
      qualifier: counts ? "Review date has passed" : "Audit data unavailable",
    },
    {
      label: "Open high-risk actions",
      href: "/actions",
      icon: ListTodo,
      value: counts?.openHighRiskActions ?? null,
      qualifier: counts ? "Open high and critical priority actions" : "Action data unavailable",
    },
    {
      label: "Training evidence expiring",
      href: "/evidence",
      icon: GraduationCap,
      value: counts?.trainingEvidenceExpiring ?? null,
      qualifier: counts ? "Due within the next 30 days" : "Evidence data unavailable",
    },
    {
      label: "Open complaints",
      href: "/registers",
      icon: HeartHandshake,
      value: counts?.openComplaints ?? null,
      qualifier: counts ? "Not closed or archived" : "Register data unavailable",
    },
    {
      label: "Open safeguarding matters",
      href: "/registers",
      icon: ShieldAlert,
      value: counts?.openSafeguarding ?? null,
      qualifier: counts ? "Not closed or archived" : "Register data unavailable",
    },
    {
      label: "Incidents awaiting review",
      href: "/registers",
      icon: Siren,
      value: counts?.incidentsAwaitingReview ?? null,
      qualifier: counts ? "Open, in review or awaiting action" : "Register data unavailable",
    },
    {
      label: "Risks overdue for review",
      href: "/risks",
      icon: TriangleAlert,
      value: counts?.risksOverdueReview ?? null,
      qualifier: counts ? "Open risks past their review date" : "Risk data unavailable",
    },
    {
      label: "Governance meetings due",
      href: "/meetings",
      icon: CalendarClock,
      value: counts?.governanceMeetingsDue ?? null,
      qualifier: counts ? "Scheduled or in-progress within 30 days" : "Meeting data unavailable",
    },
    {
      label: "Documents expiring in 30 days",
      href: "/evidence",
      icon: FileClock,
      value: counts?.documentsExpiring ?? null,
      qualifier: counts ? "Due within the next 30 days" : "Evidence data unavailable",
    },
  ];
}

export function dashboardModules(): DashboardModule[] {
  return [
    {
      name: "Foundation controls",
      href: "/settings",
      status: "ready",
      description: "Authentication, tenant scope and permissions are active.",
    },
    {
      name: "Policies and evidence",
      href: "/policies",
      status: "ready",
      description: "Policy and evidence controls are active.",
    },
    {
      name: "Registers and risks",
      href: "/risks",
      status: "ready",
      description: "Operational registers and scored risk controls are active.",
    },
    {
      name: "Audits and actions",
      href: "/actions",
      status: "ready",
      description: "Audit and evidence-backed action controls are active.",
    },
    {
      name: "Governance and calendar",
      href: "/meetings",
      status: "ready",
      description: "Structured governance meetings, minutes and decisions are active.",
    },
    {
      name: "KPIs and inspection readiness",
      href: "/kpis",
      status: "ready",
      description: "KPI reporting and internal inspection-evidence readiness controls are active.",
    },
  ];
}
