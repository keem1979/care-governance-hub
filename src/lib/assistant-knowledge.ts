import { PERMISSIONS } from "@/lib/permissions";

type AssistantLink = {
  label: string;
  href: string;
  keywords: string[];
  requiredAny?: string[];
};

type AssistantTopic = {
  name: string;
  href: string;
  keywords: string[];
  summary: string;
  guidance: string;
  requiredAny?: string[];
  links: AssistantLink[];
};

export type AssistantReply = {
  answer: string;
  links: { label: string; href: string }[];
  navigate: boolean;
};

const view = [PERMISSIONS.GOVERNANCE_VIEW];
const edit = [PERMISSIONS.GOVERNANCE_EDIT];
const reports = [PERMISSIONS.REPORTS_EXPORT];

export const ASSISTANT_TOPICS: AssistantTopic[] = [
  topic("Dashboard", "/dashboard", ["dashboard", "home", "overview", "alerts", "tasks", "summary"], "The Dashboard summarises current governance priorities from live records.", "Use it to review due policy work, audits, evidence expiry, open register items, risks, actions, meetings and recent activity.", undefined, []),
  topic("Policies", "/policies", ["policy", "policies", "approval", "review date", "version"], "Policies controls policy ownership, approval, review dates, status and file versions.", "Open a policy to inspect its metadata and versions. Users with governance-edit access can create, update, approve, archive and restore policies.", view, [
    link("Open Policies", "/policies", ["view", "list", "search"], view),
    link("Add a policy", "/policies/new", ["add", "create", "new", "upload"], edit),
  ]),
  topic("Evidence Library", "/evidence", ["evidence", "document", "documents", "file", "files", "expiry"], "The Evidence Library stores controlled evidence records and private file versions.", "Use it to upload, classify, review, version, download, archive and link evidence to governance work.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD], [
    link("Open Evidence Library", "/evidence", ["view", "list", "search"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]),
    link("Add evidence", "/evidence/new", ["add", "create", "new", "upload"], [PERMISSIONS.EVIDENCE_UPLOAD]),
  ]),
  topic("Audit Centre", "/audits", ["audit", "audits", "finding", "findings", "assurance", "score"], "Audit Centre runs reusable audits, records responses, calculates scores and creates findings.", "Start from a published template, complete questions with comments or evidence, submit the audit, review findings and print the audit report.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE], [
    link("Open Audit Centre", "/audits", ["view", "list", "templates"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE]),
    link("Start an audit", "/audits/new", ["start", "add", "create", "new"], [PERMISSIONS.AUDITS_COMPLETE]),
  ]),
  topic("Registers", "/registers", ["register", "registers", "complaint", "incident", "safeguarding", "accident", "breach", "feedback"], "Registers provides consistent records for complaints, incidents, safeguarding and other governance events.", "Choose a register, add an entry, assign its owner and risk level, link evidence, update status and export or print a register report.", view, [
    link("Open Registers", "/registers", ["view", "list", "choose"], view),
  ]),
  topic("Risk Register", "/risks", ["risk", "risks", "likelihood", "impact", "control", "residual"], "Risk Register records initial and residual risk, controls, ownership and review dates.", "Use it to add risks, document controls, schedule reviews, record review outcomes, close risks with approval and produce a risk report.", view, [
    link("Open Risk Register", "/risks", ["view", "list", "search"], view),
    link("Add a risk", "/risks/new", ["add", "create", "new"], edit),
    link("Open risk report", "/risks/report", ["report", "print", "pdf"], reports),
  ]),
  topic("Action Tracker", "/actions", ["action", "actions", "task", "tasks", "due", "overdue", "closure"], "Action Tracker manages accountable improvement actions through evidence-based closure.", "Create or assign an action, add progress updates, change status, attach evidence, obtain verification and use the action report for oversight.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT], [
    link("Open Action Tracker", "/actions", ["view", "list", "assigned"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT]),
    link("Create an action", "/actions/new", ["add", "create", "new", "assign"], [PERMISSIONS.ACTIONS_MANAGE]),
    link("Open action report", "/actions/report", ["report", "print", "pdf"], reports),
  ]),
  topic("Governance Meetings", "/meetings", ["meeting", "meetings", "agenda", "minutes", "decision", "attendee"], "Governance Meetings records structured agendas, attendance, discussion, decisions, minutes and linked actions.", "Create a meeting, add agenda items and attendees, record minutes and decisions, extract actions, approve the record, then print the agenda or minutes.", view, [
    link("Open Governance Meetings", "/meetings", ["view", "list"], view),
    link("Schedule a meeting", "/meetings/new", ["add", "create", "new", "schedule"], edit),
  ]),
  topic("Compliance Calendar", "/calendar", ["calendar", "deadline", "deadlines", "reminder", "expiry", "due date"], "Compliance Calendar brings reviews, expiries, audits and governance deadlines into one schedule.", "Use it to filter upcoming commitments, create manual deadlines, assign owners, complete or reopen items, and archive obsolete entries.", view, [
    link("Open Compliance Calendar", "/calendar", ["view", "list", "month"], view),
    link("Add a deadline", "/calendar/new", ["add", "create", "new", "deadline"], edit),
  ]),
  topic("KPI Dashboard", "/kpis", ["kpi", "kpis", "performance", "target", "rag", "indicator", "trend"], "KPI Dashboard records monthly measures, targets, RAG results and trends.", "Enter monthly KPI values for an organisation or location, attach notes and evidence, review trend charts, import or export CSV and print the KPI report.", view, [
    link("Open KPI Dashboard", "/kpis", ["view", "dashboard", "trend"], view),
    link("Enter KPI data", "/kpis/entry", ["add", "enter", "record", "new", "monthly"], edit),
    link("Open KPI report", "/kpis/report", ["report", "print", "pdf"], reports),
  ]),
  topic("Inspection Centre", "/inspection", ["inspection", "readiness", "cqc", "quality statement", "evidence gap", "key question"], "Inspection Centre is an internal evidence-readiness workspace; it does not predict an official CQC rating.", "Map real evidence, audits, register entries and actions to requirements, review gaps, update evidence status and generate an inspection evidence pack.", view, [
    link("Open Inspection Centre", "/inspection", ["view", "readiness", "gaps"], view),
    link("Add a requirement", "/inspection/new", ["add", "create", "new", "requirement"], edit),
    link("Open inspection pack", "/inspection/pack", ["pack", "report", "print", "pdf"], reports),
  ]),
  topic("Template Library", "/templates", ["template", "templates", "form", "checklist", "starter"], "Template Library provides starter and organisation-owned governance templates.", "Preview or download a template, upload organisation templates, archive organisation-owned resources, or create a working copy in the Evidence Library.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD], [
    link("Open Template Library", "/templates", ["view", "list", "download"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]),
    link("Add a template", "/templates/new", ["add", "create", "new", "upload"], edit),
  ]),
  topic("Reports", "/reports", ["report", "reports", "board summary", "monthly governance", "quality assurance", "csv", "pdf", "export"], "Reports generates 13 inspection-ready report types from authorised live database records.", "Select a report, filter by date, location, status or category, optionally include appendices, then print to PDF or export CSV.", reports, [
    link("Open Reports", "/reports", ["view", "list", "choose"], reports),
    link("Monthly governance report", "/reports/monthly-governance", ["monthly", "governance"], reports),
    link("Quality assurance report", "/reports/quality-assurance", ["quality", "assurance"], reports),
    link("Audit report", "/reports/audit", ["audit"], reports),
    link("Risk report", "/reports/risk", ["risk"], reports),
    link("Action status report", "/reports/action-status", ["action", "status"], reports),
    link("Complaints report", "/reports/complaints", ["complaint", "complaints"], reports),
    link("Incident report", "/reports/incidents", ["incident", "incidents"], reports),
    link("Safeguarding report", "/reports/safeguarding", ["safeguarding"], reports),
    link("Policy compliance report", "/reports/policy-compliance", ["policy", "compliance"], reports),
    link("KPI report", "/reports/kpi", ["kpi", "performance"], reports),
    link("Board summary report", "/reports/board-summary", ["board", "summary", "executive"], reports),
    link("Evidence index", "/reports/evidence-index", ["evidence", "index"], reports),
    link("Inspection-readiness report", "/reports/inspection-readiness", ["inspection", "readiness"], reports),
  ]),
  topic("Activity Log", "/activity", ["activity", "activity log", "audit trail", "history", "who changed", "download event"], "Activity Log is the read-only audit trail for important system events.", "Filter by user, action, record type, location or date, inspect redacted before-and-after values and export authorised activity to CSV.", view, [
    link("Open Activity Log", "/activity", ["view", "search", "history", "export"], view),
  ]),
  topic("Settings", "/settings", ["settings", "organisation", "location", "locations", "user", "users", "role", "roles", "permission", "access"], "Settings manages organisation details, service locations, users, roles and location access.", "Authorised administrators can add or archive locations, add users, change roles or account status and review central role permissions. Safeguards prevent self-lockout and removal of the last owner.", [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE], [
    link("Open Settings", "/settings", ["view", "manage", "open"], [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE]),
  ]),
];

export function answerAssistant(query: string, permissions: readonly string[], currentPath = ""): AssistantReply {
  const clean = normalise(query);
  const wantsNavigation = /\b(go to|open|take me|navigate|show me)\b/.test(clean);
  if (!clean || /^(hi|hello|hey|help|what can you do)[.!? ]*$/.test(clean)) {
    return {
      answer: "Hi, I’m Abi. I can explain any part of the Hub, talk you through a task or open the right page for you. You could ask, “How do I add evidence?”, “Open the risk register” or “Where can I prepare a board report?”",
      links: accessible(ASSISTANT_TOPICS.map((item) => ({ label: item.name, href: item.href, requiredAny: item.requiredAny })), permissions).slice(0, 6),
      navigate: false,
    };
  }

  const current = ASSISTANT_TOPICS.find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`));
  const topic = /\b(this page|current page|here)\b/.test(clean) && current ? current : bestTopic(clean);
  if (!topic) {
    return {
      answer: "I’m not quite sure which part of the Hub you mean. Tell me whether you’re working with policies, evidence, audits, registers, risks, actions, meetings, the calendar, KPIs, inspection preparation, templates, reports, the activity log or settings. For clinical or regulatory decisions, please follow your organisation’s approved guidance.",
      links: accessible(ASSISTANT_TOPICS.map((item) => ({ label: item.name, href: item.href, requiredAny: item.requiredAny })), permissions).slice(0, 6),
      navigate: false,
    };
  }

  if (!allowed(topic.requiredAny, permissions)) {
    return {
      answer: `${topic.name} sounds like the right place, but your account does not currently have access to it. Please ask an organisation administrator to check your role or location access in Settings.`,
      links: accessible([{ label: "Open Settings", href: "/settings", requiredAny: [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE] }], permissions),
      navigate: false,
    };
  }

  const rankedLinks = topic.links
    .map((item) => ({ item, score: scoreText(clean, item.keywords.join(" ")) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
  const links = accessible(rankedLinks.length ? rankedLinks : [{ label: `Open ${topic.name}`, href: topic.href, requiredAny: topic.requiredAny }], permissions).slice(0, 4);
  if (!links.some((item) => item.href === topic.href) && allowed(topic.requiredAny, permissions)) links.push({ label: `Open ${topic.name}`, href: topic.href });
  const primary = links[0] ?? { label: `Open ${topic.name}`, href: topic.href };
  return {
    answer: wantsNavigation
      ? `Of course — I’ll open ${primary.label} for you. ${topic.summary}`
      : `${topic.summary} ${topic.guidance}`,
    links,
    navigate: wantsNavigation && Boolean(primary.href),
  };
}

function topic(name: string, href: string, keywords: string[], summary: string, guidance: string, requiredAny: string[] | undefined, links: AssistantLink[]): AssistantTopic {
  return { name, href, keywords, summary, guidance, requiredAny, links: links.length ? links : [link(`Open ${name}`, href, ["open", "view"], requiredAny)] };
}
function link(label: string, href: string, keywords: string[], requiredAny?: string[]): AssistantLink { return { label, href, keywords, requiredAny }; }
function bestTopic(query: string): AssistantTopic | undefined {
  return ASSISTANT_TOPICS.map((item) => ({
    item,
    score: scoreText(query, `${item.name} ${item.keywords.join(" ")}`) +
      (item.href === "/reports" && /\b(report|reports|export|pdf|csv)\b/.test(query) ? 6 : 0),
  })).sort((a, b) => b.score - a.score).find((item) => item.score > 0)?.item;
}
function scoreText(query: string, candidate: string): number {
  const normalCandidate = normalise(candidate);
  const queryTokens = tokens(query), candidateTokens = new Set(tokens(normalCandidate));
  let score = queryTokens.filter((token) => candidateTokens.has(token)).length;
  for (const phrase of normalCandidate.split(/\s{2,}|,/)) if (phrase.length > 3 && query.includes(phrase.trim())) score += 4;
  if (normalCandidate.includes(query) || query.includes(normalCandidate)) score += 5;
  return score;
}
function normalise(value: string): string { return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(value: string): string[] { return normalise(value).split(" ").filter((token) => token.length > 2 && !["the","and","how","can","does","this","page","please","want","need"].includes(token)); }
function allowed(requiredAny: readonly string[] | undefined, permissions: readonly string[]): boolean { return !requiredAny?.length || requiredAny.some((item) => permissions.includes(item)); }
function accessible(items: Array<{ label: string; href: string; requiredAny?: readonly string[] }>, permissions: readonly string[]) { return items.filter((item) => allowed(item.requiredAny, permissions)).map(({ label, href }) => ({ label, href })); }
