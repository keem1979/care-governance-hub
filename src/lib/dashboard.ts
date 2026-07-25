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

export function dashboardSummaries(counts?: { policiesDue: number; trainingEvidenceExpiring: number; documentsExpiring: number }): DashboardSummary[] {
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
      value: null,
      qualifier: "Audit Centre not yet built",
    },
    {
      label: "Open high-risk actions",
      href: "/actions",
      icon: ListTodo,
      value: null,
      qualifier: "Action Tracker not yet built",
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
      value: null,
      qualifier: "Complaints register not yet built",
    },
    {
      label: "Open safeguarding matters",
      href: "/registers",
      icon: ShieldAlert,
      value: null,
      qualifier: "Safeguarding register not yet built",
    },
    {
      label: "Incidents awaiting review",
      href: "/registers",
      icon: Siren,
      value: null,
      qualifier: "Incident register not yet built",
    },
    {
      label: "Risks overdue for review",
      href: "/risks",
      icon: TriangleAlert,
      value: null,
      qualifier: "Risk Register not yet built",
    },
    {
      label: "Governance meetings due",
      href: "/meetings",
      icon: CalendarClock,
      value: null,
      qualifier: "Meetings module not yet built",
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
      href: "/registers",
      status: "no-data",
      description: "No data recorded.",
    },
    {
      name: "Audits and actions",
      href: "/audits",
      status: "no-data",
      description: "No data recorded.",
    },
    {
      name: "Governance and calendar",
      href: "/meetings",
      status: "no-data",
      description: "No data recorded.",
    },
    {
      name: "KPIs and inspection readiness",
      href: "/kpis",
      status: "no-data",
      description: "No data recorded.",
    },
  ];
}
