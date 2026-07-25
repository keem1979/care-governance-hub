import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/module-placeholder";

const modules: Record<string, { title: string; description: string }> = {
  policies: {
    title: "Policies",
    description: "Manage policy review, approval and version history.",
  },
  evidence: {
    title: "Evidence Library",
    description: "Organise governance evidence without a complex file manager.",
  },
  audits: {
    title: "Audit Centre",
    description: "Complete reusable audits and turn findings into actions.",
  },
  registers: {
    title: "Registers",
    description: "Maintain consistent, searchable governance registers.",
  },
  risks: {
    title: "Risk Register",
    description: "Assess, control and review organisational and location risks.",
  },
  actions: {
    title: "Action Tracker",
    description: "Track accountable actions through evidence-based closure.",
  },
  meetings: {
    title: "Governance Meetings",
    description: "Record decisions, minutes and actions from structured meetings.",
  },
  calendar: {
    title: "Compliance Calendar",
    description: "See reviews, expiries, deadlines and governance commitments.",
  },
  kpis: {
    title: "KPI Dashboard",
    description: "Record real monthly measures, targets and trends.",
  },
  inspection: {
    title: "Inspection Centre",
    description:
      "Review internal evidence readiness without predicting an official CQC rating.",
  },
  templates: {
    title: "Templates",
    description: "Provide controlled, reusable governance templates.",
  },
  reports: {
    title: "Reports",
    description: "Generate inspection-ready reports from real database records.",
  },
  activity: {
    title: "Activity Log",
    description: "Review the non-editable history of important system activity.",
  },
  settings: {
    title: "Settings",
    description: "Manage the organisation, locations, users and access controls.",
  },
};

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const content = modules[module];
  if (!content) notFound();
  return <ModulePlaceholder {...content} />;
}
