import {
  BookOpenCheck,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  UserRoundCheck,
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

export function ukGreeting(date: Date): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/London",
    }).format(date),
  );

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function formatUkDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short",
  }).format(date);
}

export function dashboardSummaries(counts?: { policiesDue: number; overdueAudits: number; trainingEvidenceExpiring: number; documentsExpiring: number; openComplaints:number; openSafeguarding:number; incidentsAwaitingReview:number; risksOverdueReview:number; openHighRiskActions:number; overdueActions:number; governanceMeetingsDue:number; workforceChecksDue?:number; competencyActions?:number; kpiReturnsOutstanding?:number;inspectionAttention?:number }): DashboardSummary[] {
  return [
    {
      label: "Inspection requirements needing attention",
      href: "/inspection?view=gaps",
      icon: ShieldAlert,
      value: counts?.inspectionAttention ?? null,
      qualifier: counts ? "Calculated from live records, RM review and sign-off" : "Inspection data unavailable",
    },
    {
      label: "Monthly KPI returns outstanding",
      href: "/kpis/returns",
      icon: ChartNoAxesCombined,
      value: counts?.kpiReturnsOutstanding ?? null,
      qualifier: counts ? "Branches not yet ready for review this month" : "KPI return data unavailable",
    },
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
      label: "Workforce checks due",
      href: "/workforce",
      icon: UserRoundCheck,
      value: counts?.workforceChecksDue ?? null,
      qualifier: counts ? "Expired or due within the next 30 days" : "Workforce data unavailable",
    },
    {
      label: "Competency actions",
      href: "/workforce",
      icon: GraduationCap,
      value: counts?.competencyActions ?? null,
      qualifier: counts ? "Pending or development required" : "Competency data unavailable",
    },
    {
      label: "Open complaints",
      href: "/registers/complaints",
      icon: HeartHandshake,
      value: counts?.openComplaints ?? null,
      qualifier: counts ? "Not closed or archived" : "Register data unavailable",
    },
    {
      label: "Open safeguarding matters",
      href: "/registers/safeguarding",
      icon: ShieldAlert,
      value: counts?.openSafeguarding ?? null,
      qualifier: counts ? "Not closed or archived" : "Register data unavailable",
    },
    {
      label: "Incidents awaiting review",
      href: "/registers/incidents",
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
      description: "Monthly authority returns, KPI trends and inspection-evidence readiness controls are active.",
    },
    {
      name: "Workforce and care quality",
      href: "/workforce",
      status: "ready",
      description: "Safer recruitment, expiry, competency and care-quality controls are active.",
    },
  ];
}
