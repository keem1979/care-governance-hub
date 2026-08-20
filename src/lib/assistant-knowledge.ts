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
  responseClass: "GREETING" | "NAVIGATION" | "KNOWN" | "UNCERTAIN" | "PROHIBITED" | "ACCESS_DENIED";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  topicName?: string;
  sources: AssistantSource[];
  escalation?: {
    required: true;
    priority: "ROUTINE" | "HIGH" | "IMMEDIATE";
    reasonCode: string;
    message: string;
  };
};

export type AssistantSource = {
  kind: "INTERNAL_MODULE" | "INTERNAL_CONTROL" | "OFFICIAL_REGULATOR";
  label: string;
  href: string;
  authority: string;
  versionLabel?: string;
  checkedAt?: string;
};

const MANAGEMENT_ESCALATION =
  "I cannot confirm a reliable answer to that question from the verified QCGMS guidance authorised for Abi, so I will not guess or invent one. I will escalate it to your management team and have created a management escalation for review.";

const ABI_CONTROL_SOURCE: AssistantSource = {
  kind: "INTERNAL_CONTROL",
  label: "Abi scope, safety and escalation controls",
  href: "/abi-assurance",
  authority: "QCGMS controlled guidance",
  versionLabel: "Phase 9",
};

const CQC_FRAMEWORK_SOURCE: AssistantSource = {
  kind: "OFFICIAL_REGULATOR",
  label: "CQC assessment framework",
  href: "https://www.cqc.org.uk/guidance-regulation/providers/assessment/assessment-framework",
  authority: "Care Quality Commission",
  versionLabel: "Official web guidance",
  checkedAt: "2026-08-20",
};

const CQC_EVIDENCE_SOURCE: AssistantSource = {
  kind: "OFFICIAL_REGULATOR",
  label: "CQC evidence categories",
  href: "https://www.cqc.org.uk/guidance-regulation/providers/assessment/evidence-categories",
  authority: "Care Quality Commission",
  versionLabel: "Official web guidance",
  checkedAt: "2026-08-20",
};

const CQC_STANDARDS_SOURCE: AssistantSource = {
  kind: "OFFICIAL_REGULATOR",
  label: "CQC fundamental standards of care",
  href: "https://www.cqc.org.uk/about-us/fundamental-standards",
  authority: "Care Quality Commission",
  versionLabel: "Official web guidance",
  checkedAt: "2026-08-20",
};

export const TRUSTED_ASSISTANT_SOURCES: AssistantSource[] = [
  ABI_CONTROL_SOURCE,
  CQC_FRAMEWORK_SOURCE,
  CQC_EVIDENCE_SOURCE,
  CQC_STANDARDS_SOURCE,
];

const CAPABILITY_ACTIONS = [
  "access",
  "add",
  "approve",
  "archive",
  "assign",
  "change",
  "close",
  "create",
  "delete",
  "disable",
  "download",
  "edit",
  "enable",
  "export",
  "invite",
  "link",
  "merge",
  "notify",
  "print",
  "record",
  "remove",
  "reopen",
  "restore",
  "schedule",
  "search",
  "send",
  "start",
  "submit",
  "transfer",
  "unlink",
  "update",
  "upload",
  "view",
] as const;

type ModuleContext = {
  hsc: string;
  cqc: string;
};

const view = [PERMISSIONS.GOVERNANCE_VIEW];
const edit = [PERMISSIONS.GOVERNANCE_EDIT];
const reports = [PERMISSIONS.REPORTS_EXPORT];

export const ASSISTANT_TOPICS: AssistantTopic[] = [
  topic("Dashboard", "/dashboard", ["dashboard", "home", "overview", "alerts", "tasks", "summary"], "The Dashboard summarises current governance priorities from live records.", "Use it to review due policy work, audits, evidence expiry, open register items, risks, actions, meetings and recent activity.", undefined, []),
  topic("Client Directory", "/clients", ["client", "clients", "service user", "person", "people", "client record", "client profile"], "Client Directory keeps one controlled profile for each person receiving support and links their governance records in one place.", "Add the person once using an internal client reference. Start assessments, reviews and incidents from their profile, or select their name when completing a register form. Linked records and evidence then remain accessible under that client.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT], [
    link("Open Client Directory", "/clients", ["open", "find", "search", "list"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT]),
    link("Add a client", "/clients/new", ["add", "new", "create"], [PERMISSIONS.GOVERNANCE_EDIT]),
  ]),
  topic("Policies", "/policies", ["policy", "policies", "approval", "review date", "version", "remove policy", "restore policy"], "Policies controls policy ownership, approval, review dates, status and file versions.", "Open a policy to inspect its metadata and versions. Users with governance-edit access can create, update, approve, remove and restore policies. Removing a policy hides it from the active library while retaining its versions and audit history.", view, [
    link("Open Policies", "/policies", ["view", "list", "search"], view),
    link("Add a policy", "/policies/new", ["add", "create", "new", "upload"], edit),
  ]),
  topic("Evidence Library", "/evidence", ["evidence", "document", "documents", "file", "files", "expiry"], "The Evidence Library stores controlled evidence records and private file versions.", "Use it to upload, classify, review, version, download, archive and link evidence to governance work.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD], [
    link("Open Evidence Library", "/evidence", ["view", "list", "search"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]),
    link("Add evidence", "/evidence/new", ["add", "create", "new", "upload"], [PERMISSIONS.EVIDENCE_UPLOAD]),
  ]),
  topic("Policy Studio", "/policies/catalogue", ["policy studio", "policy pack", "policy template", "branded policy", "prepare policies", "policy sources"], "Policy Studio helps an organisation prepare adult social care policies using current legislation and official guidance, with its own name and contact details in the header.", "Choose the required policies, assign an accountable owner and record the local arrangements that must be included. Every policy starts as a draft and lists the official sources used. The Registered Manager must check that it reflects the service, local pathways and day-to-day practice before approval.", [PERMISSIONS.GOVERNANCE_EDIT], [
    link("Open Agency Policy Studio", "/policies/catalogue", ["open", "create", "generate", "build"], [PERMISSIONS.GOVERNANCE_EDIT]),
    link("Open Policy Library", "/policies", ["library", "existing", "review"], [PERMISSIONS.GOVERNANCE_VIEW]),
  ]),
  topic("Evidence Requirements", "/evidence/requirements", ["required evidence", "evidence gap", "missing evidence", "inspection evidence", "what evidence do i need"], "The Evidence Requirements Register is a sourced homecare baseline across the five CQC key questions.", "Use it to see current, expiring, expired and missing evidence, read the regulatory basis, and upload directly against each requirement. Service-specific items must be tailored by the Registered Manager.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD], [
    link("Show missing evidence", "/evidence/requirements?status=NEEDS_EVIDENCE", ["missing", "gap", "needed"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]),
    link("Open requirements register", "/evidence/requirements", ["open", "requirements", "list"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]),
  ]),
  topic("Call Log", "/registers/call-log", ["call log", "phone call", "telephone call", "outbound call", "inbound call", "voicemail"], "The Call Log records important inbound and outbound calls, decisions, escalation and follow-up.", "Use a clear internal reference, record the factual outcome, set a follow-up date when needed, link supporting evidence and create an Action Tracker item for formal follow-up.", view, [
    link("Add a call", "/registers/call-log/new", ["add", "record", "new"], edit),
    link("Open Call Log", "/registers/call-log", ["open", "view", "list"], view),
    link("Call Log report", "/registers/call-log/report", ["report", "print", "export"], reports),
  ]),
  topic("Audit Centre", "/audits", ["audit", "audits", "finding", "findings", "assurance", "score", "sample", "cqc self assessment"], "Audit Centre provides risk-based forms for care delivery, workforce, safety, people experience, clinical practice, information governance and leadership. It records the objective, standard, sample, sources, findings and sign-off; its score is internal assurance, not a predicted CQC rating.", "Choose the form that matches the risk, define a representative sample and any limitations, then record what was checked for every answer. Partial and failed checks create findings. A submitted audit is also listed in the Evidence Library; use the Action Tracker for required improvements.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE], [
    link("Open Audit Centre", "/audits", ["view", "list", "templates"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE]),
    link("Start an audit", "/audits/new", ["start", "add", "create", "new"], [PERMISSIONS.AUDITS_COMPLETE]),
  ]),
  topic("Care Plans", "/care-plans", ["care plan", "care plans", "person centred plan", "staff quick guide", "plan version", "read and understood"], "Care Plans is the controlled operational source of truth for person-centred care instructions, risks, outcomes, escalation and staff implementation.", "Open the person's current plan, use Quick Update for an urgent controlled amendment, or Start Review to take a version snapshot and propose only what changed. Published versions remain read-only and material changes require acknowledgement.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT], [
    link("Open Care Plans", "/care-plans", ["open", "view", "list"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT]),
    link("Create a care plan", "/care-plans/new", ["create", "new", "add"], [PERMISSIONS.GOVERNANCE_EDIT]),
  ]),
  topic("Care Plan Reviews", "/registers/care-plan-reviews", ["care plan review", "care-plan review", "rm assurance", "person involvement", "care package sufficiency", "review due"], "Care Plan Reviews provides a person-centred review and Registered Manager assurance workflow for changing needs, risks, outcomes and care arrangements.", "Select the person and current plan, record the review trigger and evidence, involve the person, assess applicable domains, reconcile medicines where relevant, control actions through the central Action Tracker and complete the Registered Manager assurance test before sign-off.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT], [
    link("Open Care Plan Reviews", "/registers/care-plan-reviews", ["open", "view", "list"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT]),
    link("Start a care-plan review", "/registers/care-plan-reviews/new", ["start", "add", "create", "new"], [PERMISSIONS.GOVERNANCE_EDIT]),
  ]),
  topic("Registers", "/registers", ["register", "registers", "complaint", "incident", "safeguarding", "accident", "breach", "feedback"], "Registers provides consistent records for complaints, incidents, safeguarding and other governance events.", "Choose a register, add an entry, assign its owner and risk level, link evidence, update status and export or print a register report.", view, [
    link("Open Registers", "/registers", ["view", "list", "choose"], view),
  ]),
  topic("Assessment Centre", "/assessments", ["assessment", "assessments", "initial assessment", "consent", "environmental assessment", "impact assessment", "falls assessment", "moving handling", "capacity assessment"], "Assessment Centre organises initial needs, decision-specific consent, person-centred risk assessments and service impact assessments in one clear pathway.", "Begin with Initial Needs & Suitability, then complete the Consent & Authority checklist. Choose only specialist assessments indicated by need or risk. Each specialist form requires two source references and records involvement, findings, controls and review. Voice typing is available, and the saved assessment is listed in the Evidence Library.", view, [
    link("Open Assessment Centre", "/assessments", ["open", "view", "types"], view),
    link("Start initial assessment", "/registers/assessment-initial-needs/new", ["start", "initial", "new"], edit),
    link("Record consent and authority", "/registers/assessment-consent-authority/new", ["consent", "authority"], edit),
  ]),
  topic("Risk Register", "/risks", ["risk", "risks", "likelihood", "impact", "control", "residual", "inherent", "tolerance", "appetite", "target risk"], "Risk Register gives managers one controlled view of threats to people, care quality and the organisation. It separates inherent risk before controls, current residual risk after controls and the target level management is working towards.", "Start with a cause, uncertain event and consequence; score the inherent risk; test the controls; set appetite and tolerance; then assign a treatment owner, target date and early-warning indicator. Each saved risk is listed in the Evidence Library, and every review records the checks made, trend and management decision.", view, [
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
  topic("Care Quality", "/quality", ["care quality", "care plan", "mar audit", "medication audit", "delegated healthcare", "service user outcome", "satisfaction survey", "business continuity", "commissioner contract"], "Care Quality is the Registered Manager’s live quality and outcomes overview. It brings together assessments, operational records, KPI signals and improvement actions without creating a second copy of those records.", "Review the attention queue and quality signals first, then open the named source module to add or update the underlying record. Use the quality report for formal oversight and Inspection Centre for evidence mapping.", view, [
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
  topic("Security & Integration Assurance", "/assurance", ["security", "integration", "nourish", "carelens", "carenexus", "microsoft 365", "payroll", "training platform", "dspt", "cyber essentials", "mfa", "backup"], "Security & Integration Assurance separates active native QCGMS data flows from unconnected external candidates and shows the mandatory approval gates before supplier data exchange.", "Use it to review security-control ownership, export the candidate review schedule and plan a connection without claiming that a supplier integration or external certification is active.", [PERMISSIONS.ORGANISATION_MANAGE], [
    link("Open Security & Integration Readiness", "/assurance", ["view", "open", "review"], [PERMISSIONS.ORGANISATION_MANAGE]),
  ]),
  topic("Connected Governance", "/connected-governance", ["connected governance", "integration connection", "api token", "staged import", "source authority", "offline capture", "quarantined event"], "Connected Governance controls approved integrations, staged imports, source authority, failed events and encrypted offline observations.", "Propose and approve each connection through eight gates, issue inbound credentials only after activation, stage CSV records for analysis and reconcile uncertain identities before applying safe rows.", [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ORGANISATION_MANAGE], [
    link("Open Connected Governance", "/connected-governance", ["open", "view", "connections"], [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ORGANISATION_MANAGE]),
    link("Open Data Quality", "/data-quality", ["reconcile", "conflict", "identity"], view),
  ]),
  topic("Abi Assurance", "/abi-assurance", ["abi", "assistant", "source", "citation", "confidence", "uncertain", "prohibited", "feedback", "escalation"], "Abi Assurance shows how every guidance answer is classified, cited, audited and escalated when QCGMS cannot support a safe answer.", "Review known, uncertain and prohibited answers, inspect the sources used, monitor user feedback and record management decisions for escalated questions.", view, [
    link("Open Abi Assurance", "/abi-assurance", ["open", "view", "review", "escalation"], view),
  ]),
  topic("Implementation Centre", "/implementation", ["implementation", "onboarding", "sandbox", "configuration", "promotion", "go live", "notification preference", "adoption analytics"], "Implementation Centre controls versioned organisation settings, onboarding evidence, sandbox testing, independent live promotion and privacy-safe adoption measures.", "Start the controlled onboarding checklist, create a sandbox configuration and record evidence for every required item. A different authorised manager must approve a safe version before it becomes live.", [PERMISSIONS.ORGANISATION_MANAGE], [
    link("Open Implementation Centre", "/implementation", ["open", "view", "configure", "onboarding"], [PERMISSIONS.ORGANISATION_MANAGE]),
  ]),
  topic("Launch Assurance", "/launch-readiness", ["phase 11", "launch", "pilot", "beta", "external pilot", "commercial readiness", "paying intent", "benchmark", "validation"], "Launch Assurance records internal and external pilot scope, matched baseline and follow-up measures, independent verification, commercial service evidence and external buyer intent.", "Create each pilot separately, agree the calculation before use, record the follow-up against the same method and ask a different authorised manager to verify it. Complete the service-readiness register and record buyer intent without presenting interest as revenue.", [PERMISSIONS.ORGANISATION_MANAGE], [
    link("Open Launch Assurance", "/launch-readiness", ["open", "view", "pilot", "launch"], [PERMISSIONS.ORGANISATION_MANAGE]),
  ]),
  topic("Settings", "/settings", ["settings", "organisation", "location", "locations", "user", "users", "role", "roles", "permission", "access"], "Settings manages organisation details, service locations, users, roles and location access.", "Authorised administrators can add or archive locations, add users, change roles or account status and review central role permissions. Safeguards prevent self-lockout and removal of the last owner.", [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE], [
    link("Open Settings", "/settings", ["view", "manage", "open"], [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE]),
  ]),
];

export const MODULE_CONTEXTS: Record<string, ModuleContext> = {
  "/clients": {
    hsc: "a controlled client directory lets staff find the right person and keeps assessments, reviews, incidents and outcomes connected without repeatedly entering identifying details.",
    cqc: "linked person-level records can support safe, effective, responsive and well-led evidence when access is proportionate, information is accurate and records show involvement, consent, review and action. The directory itself is not evidence that care was delivered well.",
  },
  "/dashboard": {
    hsc: "a governance dashboard gives leaders one place to notice overdue work, emerging risks and gaps before they affect people’s care.",
    cqc: "it can support the well-led question by showing active oversight, but inspectors will still test the underlying records, decisions, actions and outcomes.",
  },
  "/policies": {
    hsc: "policies turn legislation, recognised guidance and the organisation’s agreed approach into consistent expectations for staff.",
    cqc: "controlled, current policies can support process evidence across all five key questions, including safeguarding, staffing and good governance. A policy alone is not proof that practice follows it.",
  },
  "/policies/catalogue": {
    hsc: "Policy Studio uses current care regulation, official guidance and employment-law sources to prepare drafts that an organisation can adapt to its service and local pathways.",
    cqc: "policies based on current legislation and official guidance can support evidence across all five key questions, but CQC also considers practice, people’s experiences, outcomes and leadership. A Policy Studio draft is not approved until the organisation completes its own review and approval process.",
  },
  "/evidence": {
    hsc: "evidence shows what the service actually did, how it checked quality and whether people experienced safe, effective and person-centred care.",
    cqc: "documents mainly support process and outcome evidence. CQC may also consider people’s experiences, staff and leader feedback, partner feedback and observation, so a document library should never be the only source of assurance.",
  },
  "/evidence/requirements": {
    hsc: "an evidence requirements register helps the Registered Manager see what assurance is present, what is expiring and where a documented gap needs action.",
    cqc: "the register maps a homecare baseline to the five key questions and relevant regulations, but CQC evidence categories are a guide rather than a universal checklist and the service must tailor requirements to its regulated activities.",
  },
  "/registers/call-log": {
    hsc: "a structured call log preserves important communications, decisions, escalation and follow-up without relying on memory or informal notes.",
    cqc: "accurate, proportionate call records can support person-centred care, continuity, complaints handling, safeguarding and good governance when follow-up is completed and sensitive information is protected.",
  },
  "/audits": {
    hsc: "audits compare day-to-day practice with an agreed standard, identify gaps and provide a basis for improvement.",
    cqc: "well-designed audits and completed follow-up can support safe, effective and well-led evidence, particularly good governance and learning. An internal audit is provider evidence, not a CQC judgement.",
  },
  "/registers": {
    hsc: "registers create a consistent record of complaints, incidents, safeguarding concerns and other events so patterns, responses and learning are not lost.",
    cqc: "these records can support the safe, responsive and well-led questions and fundamental standards relating to safeguarding, complaints, good governance and duty of candour.",
  },
  "/assessments": {
    hsc: "assessments should begin with the person’s needs, preferences and desired outcomes, then use decision-specific consent and only the specialist assessments indicated by need or risk. They should be proportionate, involve the person and be reviewed after change.",
    cqc: "assessment records can support Regulations 9, 11, 12, 14, 15 and 17 when they show competent assessment, people’s involvement, lawful decision making, practical controls and timely review. A completed form alone does not prove safe practice.",
  },
  "/risks": {
    hsc: "a risk register helps leaders identify possible harm, describe what might happen and why, understand who could be affected, distinguish risk before and after controls, assign treatment and monitor early-warning indicators. Risks above tolerance should be actively treated or formally accepted with a clear rationale.",
    cqc: "a current, person-centred risk register can support Regulation 12 and Regulation 17 evidence about safe systems when it shows proportionate assessment, working controls, ownership, review, escalation and improvement. Inspectors may test the record against practice, so the linked assurance evidence and review conclusions matter as much as the score.",
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
    cqc: "the five key questions remain safe, effective, caring, responsive and well-led. CQC is developing sector-specific assessment frameworks during 2026, so this module is an internal evidence-readiness tool and must not be treated as an official rating predictor.",
  },
  "/templates": {
    hsc: "approved templates help staff capture information consistently and reduce omissions in recurring governance work.",
    cqc: "templates can support reliable processes, but inspectors are likely to look at completed records, staff practice and people’s outcomes rather than an unused blank form.",
  },
  "/reports": {
    hsc: "reports bring records together so leaders can identify themes, provide assurance and make decisions using current information.",
    cqc: "clear reports may support provider information, process and outcome evidence. Hub reports are internal governance documents, not official CQC inspection reports.",
  },
  "/registers/care-plan-reviews": {
    hsc: "care-plan reviews show how changing needs, risks, preferences and outcomes lead to safe, person-centred adjustments with accountable follow-up.",
    cqc: "clear involvement, consent, evidence, risk controls, staff implementation and management assurance may support safe, effective, responsive and well-led evidence; the review remains an internal professional record.",
  },
  "/care-plans": {
    hsc: "a controlled care plan turns assessed needs, preferences, risks, outcomes and clinical escalation into clear current instructions for the people providing support.",
    cqc: "person involvement, lawful consent, current risk controls, competent implementation, evidence, review and version history may support safe, effective, caring, responsive and well-led evidence; the plan itself does not prove that care was delivered as intended.",
  },
  "/activity": {
    hsc: "an activity log provides accountability by showing who changed important records and when.",
    cqc: "a reliable audit trail can support good governance, transparency and record integrity, especially when the organisation can explain how changes are reviewed.",
  },
  "/assurance": {
    hsc: "secure, proportionate information handling and reliable system connections protect people, staff and service continuity.",
    cqc: "access controls, audit trails, continuity arrangements and information-governance assurance may support well-led and safe evidence, but external certifications and hosting controls must be verified separately.",
  },
  "/connected-governance": {
    hsc: "controlled connections reduce duplicate entry while keeping identity conflicts, failures and source authority visible to accountable managers.",
    cqc: "traceable data exchange and reconciliation may support safe and well-led evidence when suppliers, lawful processing, operational fallbacks and source decisions are independently assured.",
  },
  "/abi-assurance": {
    hsc: "a constrained assistant can help staff find governance guidance while making clear when professional or management judgement is required.",
    cqc: "source citations, uncertainty, feedback and escalation may support transparent governance, but Abi is not regulator guidance and cannot assess compliance or predict a rating.",
  },
  "/settings": {
    hsc: "settings define organisational accountability, location scope and least-privilege access to sensitive governance information.",
    cqc: "clear responsibilities, controlled access and traceable permission changes can support well-led and good-governance evidence, including confidentiality and information security.",
  },
  "/implementation": {
    hsc: "controlled implementation keeps organisation configuration, safety defaults, onboarding evidence and live promotion accountable and traceable.",
    cqc: "clear governance, access control, evidence of staff preparation and managed change can support well-led assurance; configuration status does not prove compliance or predict a rating.",
  },
  "/launch-readiness": {
    hsc: "controlled pilots help a provider test whether governance workflows create measurable benefit without turning beta activity into unsupported claims.",
    cqc: "independently verified pilot outcomes and evidenced service operations may support well-led assurance, but they do not prove compliance, regulator endorsement or a future rating.",
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
      responseClass: "GREETING",
      confidence: "HIGH",
      sources: [ABI_CONTROL_SOURCE],
    };
  }

  const prohibited = prohibitedQuestion(clean);
  if (prohibited) {
    return {
      answer: prohibited.answer,
      links: prohibited.priority === "IMMEDIATE" ? [] : accessible([{ label: "Open Abi Assurance", href: "/abi-assurance", requiredAny: view }], permissions),
      navigate: false,
      responseClass: "PROHIBITED",
      confidence: "NONE",
      sources: [ABI_CONTROL_SOURCE],
      escalation: { required: true, priority: prohibited.priority, reasonCode: prohibited.reasonCode, message: prohibited.escalationMessage },
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
      responseClass: "KNOWN",
      confidence: "HIGH",
      topicName: "CQC assessment framework",
      sources: cqcSources(clean),
    };
  }
  if (!topic) {
    return {
      answer: MANAGEMENT_ESCALATION,
      links: [],
      navigate: false,
      responseClass: "UNCERTAIN",
      confidence: "LOW",
      sources: [ABI_CONTROL_SOURCE],
      escalation: { required: true, priority: "ROUTINE", reasonCode: "NO_AUTHORISED_TOPIC", message: "No authorised Abi topic could support a reliable answer." },
    };
  }

  if (!hasVerifiedTopicAnswer(clean, topic, wantsNavigation)) {
    return {
      answer: MANAGEMENT_ESCALATION,
      links: [],
      navigate: false,
      responseClass: "UNCERTAIN",
      confidence: "LOW",
      topicName: topic.name,
      sources: [moduleSource(topic), ABI_CONTROL_SOURCE],
      escalation: { required: true, priority: "ROUTINE", reasonCode: "UNVERIFIED_CAPABILITY", message: `The question referred to ${topic.name}, but the requested capability is not confirmed by its controlled guidance.` },
    };
  }

  if (!allowed(topic.requiredAny, permissions)) {
    return {
      answer: `${topic.name} sounds like the right place, but your account does not currently have access to it. Please ask an organisation administrator to check your role or location access in Settings.`,
      links: accessible([{ label: "Open Settings", href: "/settings", requiredAny: [PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE] }], permissions),
      navigate: false,
      responseClass: "ACCESS_DENIED",
      confidence: "HIGH",
      topicName: topic.name,
      sources: [moduleSource(topic), ABI_CONTROL_SOURCE],
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
    responseClass: wantsNavigation ? "NAVIGATION" : "KNOWN",
    confidence: "HIGH",
    topicName: topic.name,
    sources: wantsNavigation ? [moduleSource(topic)] : [moduleSource(topic), CQC_FRAMEWORK_SOURCE],
  };
}

function prohibitedQuestion(query: string): { answer: string; priority: "HIGH" | "IMMEDIATE"; reasonCode: string; escalationMessage: string } | null {
  if (/\b(not breathing|unconscious|choking|immediate danger|life threatening|suicide|suicidal|overdose|severe bleeding|999|emergency now)\b/.test(query)) {
    return { answer: "I cannot assess or manage an emergency. Call 999 now if someone is in immediate danger or needs urgent medical help, and follow your service’s emergency and safeguarding procedure. I have also raised an immediate management escalation, but do not wait for that response.", priority: "IMMEDIATE", reasonCode: "URGENT_SAFETY", escalationMessage: "The question may describe an urgent safety or medical situation. Immediate procedures take priority over Abi." };
  }
  if (/\b(what dose|which dose|change (the )?(dose|medication)|stop (the )?(medicine|medication)|should i (give|administer)|diagnos|prescribe|clinical decision|treatment decision)\b/.test(query)) {
    return { answer: "I cannot provide a clinical, diagnostic, prescribing or medication-administration decision. Follow the person’s current authorised care and medicines instructions and contact the appropriate clinician or manager. I have raised this for management review.", priority: "HIGH", reasonCode: "CLINICAL_DECISION", escalationMessage: "Abi was asked for a clinical or medication decision outside its permitted scope." };
  }
  if (/\b(legal advice|is this legal|guarantee compliance|guarantee.*cqc|predict.*rating|what.*cqc.*rating|what.*rating.*cqc|cqc rating will|official cqc rating)\b/.test(query)) {
    return { answer: "I cannot give legal advice, certify compliance or predict an official regulator rating. I can help locate the relevant controlled records, but an authorised manager or qualified adviser must make the decision. I have raised this for management review.", priority: "HIGH", reasonCode: "LEGAL_OR_RATING_DECISION", escalationMessage: "Abi was asked to provide legal assurance, certify compliance or predict a regulator decision." };
  }
  if (/\b(bypass|disable|evade|hide|cover up|erase|tamper)\b.*\b(access|security|audit|activity|evidence|history|record|mfa|permission)\b/.test(query)) {
    return { answer: "I cannot help bypass access controls, hide evidence or tamper with audit history. The request has been raised for management review.", priority: "HIGH", reasonCode: "SECURITY_OR_RECORD_TAMPERING", escalationMessage: "Abi received a request that could weaken security or record integrity." };
  }
  return null;
}

function moduleSource(topic: AssistantTopic): AssistantSource {
  return { kind: "INTERNAL_MODULE", label: `${topic.name} controlled module guidance`, href: topic.href, authority: "QCGMS live module", versionLabel: "Current deployed workflow" };
}

function cqcSources(query: string): AssistantSource[] {
  if (/\b(evidence categories|types of evidence|what evidence)\b/.test(query)) return [CQC_EVIDENCE_SOURCE];
  if (/\b(fundamental standards|minimum standards)\b/.test(query)) return [CQC_STANDARDS_SOURCE];
  return [CQC_FRAMEWORK_SOURCE];
}

function hasVerifiedTopicAnswer(
  query: string,
  topic: AssistantTopic,
  wantsNavigation: boolean,
): boolean {
  if (wantsNavigation) return true;

  const requestedActions = CAPABILITY_ACTIONS.filter((action) =>
    new RegExp(`\\b${action}\\b`).test(query),
  );
  if (requestedActions.length) {
    const verifiedTopicGuidance = normalise(
      [
        topic.summary,
        topic.guidance,
        ...topic.keywords,
        ...topic.links.flatMap((item) => [item.label, ...item.keywords]),
      ].join(" "),
    );

    return requestedActions.every((action) =>
      new RegExp(`\\b${action}\\b`).test(verifiedTopicGuidance),
    );
  }

  if (/\b(this page|current page|here)\b/.test(query)) return true;
  if (
    /\b(how does|how do)\b.*\b(work|help|matter)\b/.test(query) ||
    /^(what is|what are|explain|tell me about|give me an overview of)\b/.test(
      query,
    ) ||
    /\b(why does|why do|why is|why are)\b.*\b(matter|important|cqc|care)\b/.test(
      query,
    )
  ) {
    return true;
  }

  const topicTokens = new Set(tokens(`${topic.name} ${topic.keywords.join(" ")}`));
  const queryTokens = tokens(query);
  return queryTokens.length > 0 && queryTokens.every((token) => topicTokens.has(token));
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
  if (/\b(evidence categories|types of evidence)\b/.test(query)) return true;
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
    return "CQC currently groups assessment evidence into six categories: people’s experience of health and care services; feedback from staff and leaders; feedback from partners; observation; processes; and outcomes. The Hub mainly helps organise process and outcome records, but good preparation should also consider what people, staff and partners say and what inspectors may observe. CQC is developing sector-specific assessment frameworks during 2026, so always check current official guidance.";
  }
  if (/\b(fundamental standards|minimum standards)\b/.test(query)) {
    return "The fundamental standards are the minimum standards below which care must never fall. They cover areas such as person-centred care, dignity, consent, safety, safeguarding, complaints, good governance, staffing, fit and proper staff and duty of candour. The Hub can organise supporting governance records, but it cannot determine legal compliance.";
  }
  return "CQC regulates health and adult social care services in England. Its five key questions remain: is the service safe, effective, caring, responsive to people’s needs and well-led? CQC considers evidence about people’s experiences, staff and leaders, partners, observation, processes and outcomes. CQC is developing sector-specific assessment frameworks during 2026, so Abi explains readiness using the five questions while reminding users to confirm the latest official CQC guidance. The Hub supports internal assurance and does not predict or award a CQC rating.";
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
function tokens(value: string): string[] { return normalise(value).split(" ").filter((token) => token.length > 2 && !["the","and","how","what","can","does","this","page","please","want","need"].includes(token)); }
function allowed(requiredAny: readonly string[] | undefined, permissions: readonly string[]): boolean { return !requiredAny?.length || requiredAny.some((item) => permissions.includes(item)); }
function accessible(items: Array<{ label: string; href: string; requiredAny?: readonly string[] }>, permissions: readonly string[]) { return items.filter((item) => allowed(item.requiredAny, permissions)).map(({ label, href }) => ({ label, href })); }
