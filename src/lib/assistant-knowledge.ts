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

type ModuleContext = {
  hsc: string;
  cqc: string;
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
  topic("Workforce Compliance", "/workforce", ["workforce", "staff compliance", "dbs", "right to work", "visa", "training", "competency", "supervision", "appraisal", "spot check", "registration"], "Workforce Compliance keeps a controlled matrix of safer recruitment checks, training, competencies, supervision, appraisals and professional requirements.", "Add a staff compliance record, record each check or assessment, set expiry or next-due dates and use the linked calendar deadlines to follow up.", [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE], [
    link("Open Workforce Compliance", "/workforce", ["view", "matrix", "tracker"], [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE]),
    link("Add a staff record", "/workforce/new", ["add", "create", "new"], [PERMISSIONS.WORKFORCE_MANAGE]),
  ]),
  topic("Care Quality", "/quality", ["care quality", "care plan", "mar audit", "medication audit", "delegated healthcare", "service user outcome", "satisfaction survey", "business continuity", "commissioner contract"], "Care Quality brings together operational assurance for care reviews, medication, delegated healthcare, outcomes, feedback, continuity and commissioner obligations.", "Choose the relevant area, record the review or event, assign ownership, link evidence and create actions where improvement is required.", view, [
    link("Open Care Quality", "/quality", ["view", "open"], view),
  ]),
  topic("Governance Meetings", "/meetings", ["meeting", "meetings", "agenda", "minutes", "decision", "attendee"], "Governance Meetings records structured agendas, attendance, discussion, decisions, minutes and linked actions.", "Create a meeting, add agenda items and attendees, record minutes and decisions, extract actions, approve the record, then print the agenda or minutes.", view, [
    link("Open Governance Meetings", "/meetings", ["view", "list"], view),
    link("Schedule a meeting", "/meetings/new", ["add", "create", "new", "schedule"], edit),
  ]),
  topic("Compliance Calendar", "/calendar", ["calendar", "deadline", "deadlines", "reminder", "expiry", "due date"], "Compliance Calendar brings reviews, expiries, audits and governance deadlines into one schedule.", "Use it to filter upcoming commitments, create manual deadlines, assign owners, complete or reopen items, and archive obsolete entries.", view, [
    link("Open Compliance Calendar", "/calendar", ["view", "list", "month"], view),
    link("Add a deadline", "/calendar/new", ["add", "create", "new", "deadline"], edit),
  ]),
  topic("KPI Suite", "/kpis", ["kpi", "kpis", "performance", "target", "rag", "indicator", "trend", "monthly return"], "KPI Suite brings service delivery, safety, workforce, people’s experience, outcomes and governance measures into one monthly view.", "Registered Managers can complete a branch performance return covering delivery, capacity, workforce, live-in care, complaints and safeguarding. QCGMS validates related totals, calculates rates safely, updates the matching scorecard measures, keeps a submission history and exports a clear CSV.", view, [
    link("Open KPI Suite", "/kpis", ["view", "dashboard", "trend"], view),
    link("Start monthly performance return", "/kpis/monthly", ["return", "month end", "service performance"], edit),
    link("View return history", "/kpis/returns", ["history", "submitted", "draft", "review"], view),
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
  topic("Security & Integration Readiness", "/assurance", ["security", "integration", "nourish", "carelens", "carenexus", "microsoft 365", "payroll", "training platform", "dspt", "cyber essentials", "mfa", "backup"], "Security & Integration Readiness separates controls already enforced by the Hub from cloud, device and organisational controls that still require configuration or evidence.", "Use it to review security-control ownership and plan approved data connections without claiming that a supplier integration or external certification is already active.", [PERMISSIONS.ORGANISATION_MANAGE], [
    link("Open Security & Integration Readiness", "/assurance", ["view", "open", "review"], [PERMISSIONS.ORGANISATION_MANAGE]),
  ]),
  topic("Settings", "/settings", ["settings", "organisation", "location", "locations", "user", "users", "role", "roles", "permission", "access"], "Settings manages organisation details, service locations, users, roles and location access.", "Authorised administrators can add or archive locations, add users, change roles or account status and review central role permissions. Safeguards prevent self-lockout and removal of the last owner.", [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE], [
    link("Open Settings", "/settings", ["view", "manage", "open"], [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE]),
  ]),
];

export const MODULE_CONTEXTS: Record<string, ModuleContext> = {
  "/dashboard": {
    hsc: "a governance dashboard gives leaders one place to notice overdue work, emerging risks and gaps before they affect people’s care.",
    cqc: "it can support the well-led question by showing active oversight, but inspectors will still test the underlying records, decisions, actions and outcomes.",
  },
  "/policies": {
    hsc: "policies turn legislation, recognised guidance and the organisation’s agreed approach into consistent expectations for staff.",
    cqc: "controlled, current policies can support process evidence across all five key questions, including safeguarding, staffing and good governance. A policy alone is not proof that practice follows it.",
  },
  "/evidence": {
    hsc: "evidence shows what the service actually did, how it checked quality and whether people experienced safe, effective and person-centred care.",
    cqc: "documents mainly support process and outcome evidence. CQC may also consider people’s experiences, staff and leader feedback, partner feedback and observation, so a document library should never be the only source of assurance.",
  },
  "/audits": {
    hsc: "audits compare day-to-day practice with an agreed standard, identify gaps and provide a basis for improvement.",
    cqc: "well-designed audits and completed follow-up can support safe, effective and well-led evidence, particularly good governance and learning. An internal audit is provider evidence, not a CQC judgement.",
  },
  "/registers": {
    hsc: "registers create a consistent record of complaints, incidents, safeguarding concerns and other events so patterns, responses and learning are not lost.",
    cqc: "these records can support the safe, responsive and well-led questions and fundamental standards relating to safeguarding, complaints, good governance and duty of candour.",
  },
  "/risks": {
    hsc: "a risk register helps leaders identify possible harm, record controls, assign ownership and check whether risk is reducing.",
    cqc: "current risks, effective controls and documented reviews can support evidence about safe systems, learning and good governance. Inspectors may test whether controls work in practice.",
  },
  "/actions": {
    hsc: "an action tracker turns findings and decisions into owned work with deadlines, progress records and evidence of completion.",
    cqc: "it can show that the service responds to concerns, learns and improves. Closure should be supported by evidence and verification rather than a status change alone.",
  },
  "/workforce": {
    hsc: "safer recruitment, current training, observed competence, supervision and appraisal help services ensure that staff are suitable, supported and able to deliver safe care.",
    cqc: "current checks and evidence of competence may support safe, effective and well-led evidence, including staffing and fit-and-proper-person requirements. A completed record is not a substitute for observing practice and responding to concerns.",
  },
  "/quality": {
    hsc: "care-plan reviews, medication assurance, delegated healthcare oversight, outcomes and feedback help leaders see whether care remains safe, person-centred and effective.",
    cqc: "these records may support safe, effective, caring, responsive and well-led evidence when they demonstrate people’s involvement, reliable practice, learning and measurable improvement.",
  },
  "/meetings": {
    hsc: "governance meetings provide a formal place to review quality, risk, feedback, performance and decisions with clear accountability.",
    cqc: "agendas, minutes, decisions and followed-through actions can support the well-led question by showing leadership oversight, challenge and learning.",
  },
  "/calendar": {
    hsc: "a compliance calendar reduces the chance of missing policy reviews, training, certificates, audits and other safety-critical deadlines.",
    cqc: "timely reviews and renewals can support safe, effective and well-led evidence, including staff competence and reliable governance systems.",
  },
  "/kpis": {
    hsc: "KPIs help a service monitor quality, safety, workforce and outcomes over time so leaders can act on deterioration or inequality.",
    cqc: "trends and outcomes may support the outcomes and processes CQC considers, especially under effective and well-led. Figures need context, analysis and action when performance falls short.",
  },
  "/inspection": {
    hsc: "inspection preparation should be ongoing quality assurance, not a last-minute collection of documents. It helps teams understand strengths, gaps and improvement priorities.",
    cqc: "the five key questions remain safe, effective, caring, responsive and well-led. CQC is piloting a draft sector-specific adult social care framework in 2026, so this module is an internal evidence-readiness tool and must not be treated as an official rating predictor.",
  },
  "/templates": {
    hsc: "approved templates help staff capture information consistently and reduce omissions in recurring governance work.",
    cqc: "templates can support reliable processes, but inspectors are likely to look at completed records, staff practice and people’s outcomes rather than an unused blank form.",
  },
  "/reports": {
    hsc: "reports bring records together so leaders can identify themes, provide assurance and make decisions using current information.",
    cqc: "clear reports may support provider information, process and outcome evidence. Hub reports are internal governance documents, not official CQC inspection reports.",
  },
  "/activity": {
    hsc: "an activity log provides accountability by showing who changed important records and when.",
    cqc: "a reliable audit trail can support good governance, transparency and record integrity, especially when the organisation can explain how changes are reviewed.",
  },
  "/assurance": {
    hsc: "secure, proportionate information handling and reliable system connections protect people, staff and service continuity.",
    cqc: "access controls, audit trails, continuity arrangements and information-governance assurance may support well-led and safe evidence, but external certifications and hosting controls must be verified separately.",
  },
  "/settings": {
    hsc: "settings define organisational accountability, location scope and least-privilege access to sensitive governance information.",
    cqc: "clear responsibilities, controlled access and traceable permission changes can support well-led and good-governance evidence, including confidentiality and information security.",
  },
};

export function answerAssistant(query: string, permissions: readonly string[], currentPath = ""): AssistantReply {
  const clean = normalise(query);
  const wantsNavigation = /\b(go to|open|take me|navigate|show me)\b/.test(clean);
  if (!clean || /^(hi|hello|hey|help|what can you do)[.!? ]*$/.test(clean)) {
    return {
      answer: "Hi, I’m Abi. I can explain every part of QCGMS, why it matters in health and social care, how it may support CQC inspection evidence, or give you the right page link. You could ask, “How do I complete the monthly performance return?”, “Why does the risk register matter for CQC?” or “Open Reports.”",
      links: accessible(ASSISTANT_TOPICS.map((item) => ({ label: item.name, href: item.href, requiredAny: item.requiredAny })), permissions).slice(0, 6),
      navigate: false,
    };
  }

  const current = ASSISTANT_TOPICS.find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`));
  const topic = /\b(this page|current page|here)\b/.test(clean) && current ? current : bestTopic(clean);
  if (isGeneralCqcQuestion(clean, topic)) {
    return {
      answer: cqcOverview(clean),
      links: accessible([
        { label: "Open Inspection Centre", href: "/inspection", requiredAny: view },
        { label: "Open Evidence Library", href: "/evidence", requiredAny: [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD] },
        { label: "Open Reports", href: "/reports", requiredAny: reports },
      ], permissions),
      navigate: false,
    };
  }
  if (!topic) {
    return {
      answer: "I’m not quite sure which part of QCGMS you mean. Tell me whether you’re working with policies, evidence, audits, registers, risks, actions, meetings, the calendar, KPIs, inspection preparation, templates, reports, the activity log or settings. For clinical or regulatory decisions, please follow your organisation’s approved guidance.",
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
  const moduleContext = MODULE_CONTEXTS[topic.href];
  return {
    answer: wantsNavigation
      ? `${topic.name} is the appropriate place for this. ${topic.summary}\n\nI have included the relevant link below so you can open it when you are ready. I will not change pages without your action.`
      : professionalModuleAnswer(topic, moduleContext),
    links,
    navigate: false,
  };
}

function professionalModuleAnswer(
  topic: AssistantTopic,
  moduleContext: ModuleContext | undefined,
): string {
  const sections = [
    topic.summary,
    `How it helps: ${topic.guidance}`,
  ];
  if (moduleContext) {
    sections.push(
      `Why it matters in health and social care: ${capitalise(moduleContext.hsc)}`,
      `CQC relevance: ${capitalise(moduleContext.cqc)}`,
    );
  }
  sections.push(
    `Suggested next step: Review the relevant page using the link below. If you tell me the outcome you need, I can guide you through the steps without making changes on your behalf.`,
  );
  return sections.join("\n\n");
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isGeneralCqcQuestion(
  query: string,
  topic: AssistantTopic | undefined,
): boolean {
  if (topic && topic.href !== "/inspection") return false;
  return (
    /\b(evidence categories|what is cqc|cqc inspection|cqc assessment|inspection framework|fundamental standards)\b/.test(
      query,
    ) ||
    /\b(five|5)\b.*\bkey questions\b/.test(query) ||
    (/\bcqc\b/.test(query) && !topic)
  );
}

function cqcOverview(query: string): string {
  if (/\b(evidence categories|types of evidence|what evidence)\b/.test(query)) {
    return "CQC currently groups assessment evidence into six categories: people’s experience of health and care services; feedback from staff and leaders; feedback from partners; observation; processes; and outcomes. The Hub mainly helps organise process and outcome records, but good preparation should also consider what people, staff and partners say and what inspectors may observe. CQC is piloting a draft sector-specific adult social care framework in 2026, so always check current official guidance.";
  }
  if (/\b(fundamental standards|minimum standards)\b/.test(query)) {
    return "The fundamental standards are the minimum standards below which care must never fall. They cover areas such as person-centred care, dignity, consent, safety, safeguarding, complaints, good governance, staffing, fit and proper staff and duty of candour. The Hub can organise supporting governance records, but it cannot determine legal compliance.";
  }
  return "CQC regulates health and adult social care services in England. Its five key questions remain: is the service safe, effective, caring, responsive to people’s needs and well-led? CQC considers evidence about people’s experiences, staff and leaders, partners, observation, processes and outcomes. In 2026 CQC is piloting a draft sector-specific adult social care framework, so Abi explains readiness using the five questions while reminding users to confirm the latest official CQC guidance. The Hub supports internal assurance and does not predict or award a CQC rating.";
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
