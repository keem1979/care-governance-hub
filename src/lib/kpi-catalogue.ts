export const KPI_CATALOGUE_SECTIONS = [
  {
    key: "monthly-performance",
    title: "Monthly operating picture",
    description: "The complete monthly service, capacity, workforce, complaints and safeguarding return.",
  },
  {
    key: "safe-care",
    title: "Safe care and clinical assurance",
    description: "Safety events, medicines, infection prevention, care reviews and learning from incidents.",
  },
  {
    key: "workforce",
    title: "Workforce capability and stability",
    description: "Staffing capacity, employment checks, competence, supervision, development and retention.",
  },
  {
    key: "experience-outcomes",
    title: "People’s experience and outcomes",
    description: "Continuity, involvement, feedback, complaints, satisfaction and progress towards personal outcomes.",
  },
  {
    key: "governance",
    title: "Governance, improvement and resilience",
    description: "Audits, actions, policies, notifications, data quality and business continuity.",
  },
] as const;

export type KpiCatalogueSectionKey = (typeof KPI_CATALOGUE_SECTIONS)[number]["key"];

const SAFE_CARE = new Set([
  "medication-errors", "falls", "pressure-damage", "hospital-admissions", "incidents", "near-misses",
  "risk-assessments-reviewed", "incidents-resulting-in-harm", "incident-learning-completion",
  "duty-of-candour-on-time", "mar-audit-compliance", "medicines-competency-compliance",
  "infection-prevention-compliance", "care-transitions-on-time",
]);

const WORKFORCE = new Set([
  "staff-turnover", "staff-sickness", "vacancies", "training-compliance", "supervision-compliance",
  "appraisal-compliance", "spot-check-compliance", "dbs-compliance", "right-to-work-compliance",
  "professional-registration-compliance", "competency-compliance",
]);

const EXPERIENCE_OUTCOMES = new Set([
  "care-hours-delivered", "care-plan-reviews", "service-user-satisfaction", "staff-satisfaction", "compliments",
  "continuity-of-care", "visits-within-agreed-time", "outcomes-achieved", "care-plan-involvement",
  "complaints-responded-on-time", "complaint-actions-completed", "feedback-response-rate", "carer-satisfaction",
]);

export function kpiCatalogueSection(slug: string): KpiCatalogueSectionKey {
  if (slug.startsWith("scc-")) return "monthly-performance";
  if (SAFE_CARE.has(slug)) return "safe-care";
  if (WORKFORCE.has(slug)) return "workforce";
  if (EXPERIENCE_OUTCOMES.has(slug)) return "experience-outcomes";
  return "governance";
}
