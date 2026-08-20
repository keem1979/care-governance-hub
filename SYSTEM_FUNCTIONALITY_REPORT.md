# QCGMS System Functionality Report

**System name:** Quality, Compliance and Governance Management System (QCGMS)  
**Product brand:** ATOM  
**Report purpose:** A source-grounded description of the system for users, reviewers, support teams and AI assistants.  
**Evidence basis:** Current application routes, components, server libraries, Prisma schema, migrations and automated tests inspected on 4 August 2026.  

## 1. Executive summary

QCGMS is a secure, multi-tenant governance and evidence-readiness platform for UK adult social care providers. It gives Registered Managers and authorised colleagues one place to maintain policies, evidence, audits, assessments, operational registers, risks, actions, workforce compliance, governance meetings, deadlines, KPIs, inspection evidence and management reports.

The system is designed to answer four practical questions:

1. What evidence does the service hold?
2. What is missing, due, overdue or awaiting review?
3. What risks, incidents, findings and actions need management attention?
4. Can the organisation produce a traceable evidence pack or report from real records?

QCGMS supports governance and compliance work. It does not certify compliance, replace professional judgement, predict a CQC rating, provide care planning, operate as an eMAR, or connect directly to CQC.

## 2. Primary users and access model

QCGMS uses organisation memberships, service-location assignments, roles, permissions and an optional read-only access mode. Page visibility and server-side operations are both permission-controlled.

### Default roles

| Role | Intended capability |
| --- | --- |
| Organisation Owner | Full organisation administration, users, locations, licensing, governance, workforce and reporting. |
| Nominated Individual | Organisation-wide governance, workforce and report viewing. |
| Registered Manager | Manages governance and workforce records for assigned service locations. |
| Quality or Compliance Manager | Reviews and edits governance and workforce records across assigned locations. |
| Auditor or Consultant | Completes audits, raises actions, uploads evidence and produces authorised reports for assigned locations. |
| Staff Contributor | Uploads requested evidence and updates work specifically assigned to them. |
| Read-Only Viewer | Views authorised governance records and reports without changing records. |

### Permission keys

The system centrally defines these permissions:

- `organisation:manage`
- `members:manage`
- `locations:manage`
- `governance:view`
- `governance:edit`
- `audits:complete`
- `actions:manage`
- `evidence:upload`
- `reports:export`
- `assigned-tasks:edit`
- `workforce:view`
- `workforce:manage`

Administrators can grant or remove individual permissions for a membership. The read-only access mode limits effective permissions to governance viewing, report export and workforce viewing even if the assigned role normally allows editing.

## 3. Common system behaviour

All signed-in pages share a responsive application shell with:

- ATOM/QCGMS branding and permission-aware navigation.
- Organisation name and current service-location context.
- A Back control on every module page.
- Module-specific data-source explanations and links to related views or reports.
- Responsive mobile navigation.
- Explicit loading, error, empty and forbidden-access states on core modules.
- UK date presentation and a live UK dashboard clock.
- The Abi governance assistant.
- Sign-out and session termination.

Most record-entry forms support voice dictation where text is entered. Dictation inserts the recognised transcript at the cursor and remains dependent on browser speech-recognition support and microphone permission.

## 4. Module-by-module functionality

### 4.1 Dashboard — `/dashboard`

The dashboard is the management overview and uses live, tenant-scoped records rather than invented figures.

Capabilities include:

- Automatic UK greeting, date, time and reporting-month display.
- Organisation and service-location context.
- Summary counts for policies due, overdue audits, expiring training evidence, expiring documents, open complaints, safeguarding matters, incidents awaiting review, risks overdue for review, high-risk actions, overdue actions, governance meetings due, workforce checks due, competency actions and outstanding KPI returns.
- Compliance-by-module summaries.
- Recent activity from the append-only activity log.
- Links from each management signal to its source module.
- Quick navigation to reports and current governance work.
- Honest no-data and unavailable-data states.

Data comes from policies, audits, evidence, registers, risks, actions, meetings, workforce records, KPI returns and the activity log.

### 4.2 Client Directory — `/clients`

The Client Directory is the controlled source of client identity references used by governance forms.

Capabilities include:

- Create, view and maintain a client profile.
- Automatic sequential client number/reference generation.
- Client status and service-location assignment.
- Private client profile-picture upload, replacement and removal with directory thumbnails.
- First name and internal reference use to reduce unnecessary personal-data exposure.
- Next-of-kin/contact details.
- Links from a client profile to assessments, care-plan reviews, incidents and evidence.
- Client selection in relevant manager-entry forms so names do not need to be retyped.
- Tenant and location scoping.

This is not a care-planning record or daily-notes system.

### 4.3 Policy Library — `/policies`

The Policy Library manages organisation policies, approvals, reviews, versions and linked evidence.

Capabilities include:

- Card and table views.
- Search by title or tag and filter by category or workflow state.
- Add an organisation-authored policy and upload a Word or PDF document.
- Edit policy metadata.
- Upload a replacement version while retaining previous versions.
- View and download controlled versions.
- Record ownership, category, version, effective date, review date, approval state, approver and tags.
- Archive/remove a policy with confirmation and permission checks.
- Export the policy register.
- Open policy compliance reports, inspection evidence and policy activity.
- Generate a policy from the source-grounded policy catalogue.

#### Policy Studio and catalogue

The policy catalogue contains professionally structured adult social care policy templates covering safeguarding, medicines, recruitment, workforce, health and safety, infection control, Mental Capacity Act and consent, complaints, speaking up, governance, information governance, equality, business continuity, care delivery, Duty of Candour and other regulated practice areas.

Generated policy content includes organisation branding, policy purpose, scope, rights and decision-making, legal and regulatory basis, responsibilities, procedure, records, training and competence, monitoring, approval and a source annex. Organisation branding can include the authorised organisation name, registration number, address, contact information, colour, logo and footer. Generated documents carry organisation and licensing controls, watermarking and ATOM copyright text.

The current generated policy is represented once in the Evidence Library. The evidence item points to the live Policy Library record instead of storing a new duplicate each time the document is generated.

### 4.4 Evidence Library — `/evidence`

The Evidence Library is the central index of uploaded and system-generated governance evidence.

Capabilities include:

- Upload up to ten files per submission.
- Maximum 10 MB per file.
- Allowlisted document, image and spreadsheet formats; executable files are rejected.
- Create evidence metadata without a public permanent file URL.
- Categories, evidence types, owner, evidence date, review/expiry date, tags, confidentiality and status.
- Confidentiality levels: internal, confidential and restricted.
- Active and archived states.
- Card/list browsing, searching and filtering.
- Evidence detail and edit pages.
- Add controlled evidence versions and retain version history.
- Authorised private-file download.
- Export the evidence index.
- Link evidence to a location, policy, audit, action, register, risk, meeting, workforce profile or inspection requirement.
- Display current, expiring-soon and expired status.

#### Evidence requirements and gap view — `/evidence/requirements`

The requirements catalogue organises expected evidence under Safe, Effective, Caring, Responsive and Well-led. Each requirement includes a title, quality-statement context, explanation, examples, suggested review frequency, relevant regulation and a source link. It shows whether evidence is needed, expired or current and provides a direct upload path for each gap.

The catalogue includes regulatory and operational evidence such as registration, statement of purpose, policies, incident learning, safeguarding, Duty of Candour, medicines, recruitment, training and competency, consent and capacity, care reviews, outcomes, feedback, complaints, governance, audit, actions, risk, continuity, PIR, notifications, cyber assurance and rating-display evidence.

#### Automatic evidence synchronisation

The system creates or updates a single linked evidence record for:

- Register entries.
- Submitted audits.
- Risks.
- Actions.
- Governance meetings and approved minutes.
- Generated policies.
- The live workforce training and competency matrix.

These records remain linked to their source and are updated rather than duplicated.

### 4.5 Audit Centre — `/audits`

The Audit Centre provides structured audit initiation, completion, findings, evidence and reporting.

Capabilities include:

- Browse audit templates and existing audit instances.
- Start a new audit from a template.
- Location, auditor, audit date, period, scope and review-date recording.
- Sectioned questionnaires with template-specific forms.
- Response types including compliance choices, yes/no, text, number, date and other configured types.
- Save audit responses and supporting notes.
- Record strengths, findings, severity, recommendations and evidence links.
- Calculate scores where the template supports scoring.
- Track draft, in-progress, review, completed, closed and archived states.
- Create or link improvement actions from non-compliance and findings.
- Audit detail, response and report pages.
- Professional print/PDF audit report route.
- Automatic linked evidence record for the submitted audit.
- Activity logging and tenant/location enforcement.

Audit forms are tailored to their audit subject rather than using one generic questionnaire.

### 4.6 Assessment Centre — `/assessments`

The Assessment Centre uses the shared controlled-register engine for structured assessment records.

It includes an initial needs assessment, followed by decision-specific consent and authority records before specialist assessments where relevant. Assessment types cover person-centred, clinical, environmental, organisational and information-governance risks, including examples such as falls, moving and handling, medicines support, nutrition and hydration, skin integrity, infection risk, environmental and lone-working risk, fire, equipment, equality impact and data-protection impact.

Capabilities include:

- Select an existing client instead of retyping identity data.
- Initial assessment and consent sequencing guidance.
- Decision-specific consent, capacity, representative and best-interest information.
- Voice dictation for narrative findings.
- Assessment findings, controls, involvement, evidence and review planning.
- Automatic evidence mapping for relevant assessments.
- Escalation to the Risk Register or Action Tracker where necessary.
- Search, filters, history and report/export patterns inherited from the register framework.

The application does not replace validated clinical tools. Where a recognised external tool is required, its completed record should be attached as evidence.

### 4.7 Registers — `/registers`

Registers use a reusable engine with natural, subject-specific forms rather than a generic assessment screen.

Common capabilities include:

- Catalogue grouped by safety, medicines, people, service delivery, workforce, feedback and governance.
- Add, view and edit entries.
- Automatic dated reference generation.
- Location, client/staff reference, owner, risk level and status where relevant.
- Search, filters, sorting and report view.
- CSV export.
- Supporting evidence links.
- Linked actions.
- Entry history.
- Automatic one-record-per-entry synchronisation into the Evidence Library.
- KPI source synchronisation for supported counts and rates.

#### Register catalogue

The configured catalogue includes:

**Safety, incidents and safeguarding:** complaints, compliments, incidents, accidents, near misses, safeguarding, whistleblowing, CQC notifications, falls, pressure damage, deaths, serious injuries, Duty of Candour, restrictive practice and infection events.

**Medicines and clinical assurance:** medicines errors, hospital admissions, clinical escalations, medicines-support assessments, PRN protocols, covert-medicines decisions, medicines reconciliation, medication/MAR audits and delegated healthcare tasks.

**Service delivery and people:** missed visits, late visits, care-plan reviews, person-level risk-assessment reviews, service-user outcomes, satisfaction surveys, referrals and intake, service starts, service endings, accessible information, end-of-life coordination, key/access records and money/property records.

**Workforce and workplace safety:** staff concerns, training exceptions, supervision exceptions, equipment safety, health-and-safety hazards, RIDDOR decisions, lone-working events, agency-worker assurance and professional/barring referral decisions.

**Feedback and improvement:** service-user feedback, staff feedback, complaints, compliments and survey learning.

**Governance and information:** data breaches, information-rights requests, information-sharing decisions, records disposal, conflicts of interest, gifts and hospitality, regulatory actions, PIR submissions, commissioner contracts, insurance claims, business continuity and the call log.

Each register supplies tailored labels, prompts, specialist fields and guidance about when it should be used.

### 4.8 Risk Register — `/risks`

The Risk Register records organisational and service risks, controls, scores, owners, reviews and evidence.

Capabilities include:

- Guided creation form with risk context and categories.
- Automatic risk reference.
- Inherent likelihood and impact scored from 1 to 5.
- Automatic inherent score and level.
- Existing controls and control-effectiveness recording.
- Further controls and action ownership.
- Residual likelihood, impact, score and level.
- Low, moderate, high and critical presentation with text and colour.
- Review frequency, last review and next review dates.
- Open, monitored, treated, accepted, closed and archived lifecycle where configured.
- Risk detail and edit pages.
- Add risk-review history without overwriting the original assessment.
- Heat-map/report view and CSV export.
- Link or create actions.
- Automatic linked risk assurance record in the Evidence Library.
- Dashboard and calendar signals for high or overdue risks.
- Closure controls for high/critical risks, including rationale and approval information.

### 4.9 Action Tracker — `/actions`

The Action Tracker is the cross-system improvement and accountability workflow.

Capabilities include:

- Create actions manually or from audits, care plans, assessments, complaints, incidents, safeguarding, risks, meetings, policy reviews, inspection requirements, KPIs, evidence and workforce records including spot checks, supervision, appraisal, competency and training.
- Automatic action reference.
- Source type and source-record link.
- Broad operational responsibility areas spanning care delivery, safety, workforce, premises, information governance, commissioning, notifications and business continuity.
- Separate delivery owner and Registered Manager/senior oversight lead so delegation remains visible without transferring provider duties.
- Optional controlled client link on every action, with source and location consistency checks.
- Title, description, priority, due date, status and evidence requirement.
- Priorities from low to critical.
- Statuses for open, in progress, awaiting evidence, awaiting verification, completed, overdue and cancelled.
- Action detail and edit pages.
- Progress updates with a dated update history.
- Evidence attachment or permitted evidence-waiver rationale.
- Completion and independent verification fields.
- Closure note and verification date.
- Report view and CSV export.
- Automatic action evidence record.
- Dashboard, calendar, Abi reminder and report integration.

An action is not treated as fully evidenced merely because its status was changed.
Registered Manager oversight does not mean the manager must personally complete every task; named competent staff may deliver work while management retains proportionate oversight, escalation and assurance.

### 4.10 Workforce Compliance — `/workforce`

The Workforce Suite provides controlled workforce compliance profiles rather than payroll, rostering or training delivery.

Capabilities include:

- Create and maintain a staff profile.
- Automatic sequential staff number/reference.
- Private profile-picture upload, replacement and removal with directory thumbnails.
- Role, location, employment status and key employment dates.
- Next-of-kin/emergency-contact information.
- Restricted staff-document upload and linked Evidence Library records.
- DBS, right-to-work, visa and professional-registration records.
- Training, information-governance training, supervision, appraisal, spot-check and observed-competency outcomes.
- Outcome, issue, completion, expiry and next-due dates.
- Shared Skills for Care/CQC-informed training catalogue plus organisation-specific courses.
- Assign only applicable courses to each worker.
- Live training and competency matrix.
- Automatically refreshed restricted training-matrix evidence item.
- Annual-leave allowance, annual leave, sickness and other leave requests.
- Requested working-day calculation, approval/refusal, fit-note and return-to-work follow-up.
- Workforce expiry items shown in the Compliance Calendar and dashboard.
- Dedicated `workforce:view` and `workforce:manage` permissions.

The module does not run payroll, shifts, rotas or an external learning-management system.

### 4.11 Care Quality — `/quality`

Care Quality is a management overview, not a duplicate record-entry module.

Capabilities include:

- Draw together care-plan reviews, risk-assessment reviews, medicines/MAR audits, delegated healthcare assurance, outcomes, satisfaction, continuity and commissioner information.
- Show quality signals and an attention queue from source records.
- Direct the manager to the correct source record for updates.
- Link to quality KPIs, Inspection Centre and quality-assurance reports.
- Avoid copying the same operational record into a second database workflow.

### 4.12 Governance Meetings — `/meetings`

The meeting module manages governance agendas, attendance, discussion, decisions, minutes and actions.

Capabilities include:

- Create meetings by type, date, time, location/video link and reporting period.
- Chair, attendees, apologies and attendance status.
- Structured agenda items and previous actions.
- Sections for KPIs, audits, complaints, incidents, safeguarding, workforce, risks, improvement and decisions.
- Agenda page and print/export view.
- Minutes entry and print/export view.
- Draft, scheduled, held, awaiting approval, approved and archived lifecycle where configured.
- Approver and approval date.
- Create actions from meeting decisions.
- Roll forward unresolved previous actions.
- Next-meeting date.
- Automatic meeting or approved-minutes evidence record.
- Calendar, dashboard, Action Tracker and monthly-governance report integration.

### 4.13 Compliance Calendar — `/calendar`

The Calendar combines due dates from multiple modules with manually entered compliance events.

Capabilities include:

- Month, week and agenda-style time views.
- Automatic events from policy reviews, audit due dates, meetings, risk reviews, action deadlines and evidence expiries.
- Classification of training, competency, certificate, insurance, supervision and appraisal expiries.
- Manual compliance calendar items.
- Owner, location, record type, risk and status filtering.
- In-app reminders at configurable day offsets such as 90, 60, 30, 14 and 7 days, on the due date and overdue.
- Direct links back to the source record.
- Automatic overdue calculation for active past-due items.

Email reminder delivery is not currently an active integration.

### 4.14 KPI Suite — `/kpis`

The KPI Suite supports monthly management records, commissioner-return preparation, trend review and evidence-backed values.

Capabilities include:

- Professional KPI catalogue grouped into monthly performance, safe care, workforce, experience/outcomes and governance.
- Entry workspace for all configured indicators.
- Monthly return form and return-history pages.
- Previous/next month navigation and location scope.
- Targets, direction, units and RAG thresholds.
- Manual entry with notes and mandatory source description.
- Source options including QCGMS modules, care-management systems and external records.
- Source-link field and evidence attachment.
- Automatic rates and percentages from numerator/denominator inputs where configured, including care-call exception rates and related rate indicators.
- Automatic synchronisation from supported registers, actions, workforce, audits and policies.
- Clearly identify auto-synchronised values.
- Standardised result controls and no-data states.
- Twelve-month trends and location comparison.
- Monthly return validation and submission state.
- CSV import and CSV export.
- Printable/PDF scorecard and monthly-return export route.
- KPI report and dashboard integration.

The system must not invent a KPI value. A missing source remains awaiting update/no data.

### 4.15 Inspection Centre — `/inspection`

The Inspection Centre is an internal evidence-readiness workspace.

Capabilities include:

- Organise requirements under Safe, Effective, Caring, Responsive and Well-led.
- Configurable quality-statement context.
- Requirement explanation, evidence examples, regulations, source and review frequency.
- Link evidence, audits, register entries and actions.
- Owner, review date, status and confidence notes.
- Add or edit an inspection requirement.
- Requirement detail page.
- Evidence-gap and overdue-evidence views.
- Inspection checklist and readiness summary.
- Evidence index.
- Build/print an inspection pack.
- Inspection report/export routes.

The readiness position is internal only. It is not an official CQC assessment, rating or guarantee of outcome.

### 4.16 Template Library — `/templates`

The Template Library stores reusable organisation and starter documents.

Capabilities include:

- Browse templates by category and status.
- Search and filter.
- Add a template with metadata and an uploaded file.
- View, edit, archive and download authorised templates.
- Maintain version, author, review date and tags.
- Copy a template into the organisation's Evidence Library.
- Track template activity.
- Categories for policies, audits, risk assessments, meetings, actions, investigations, complaints, incidents, safeguarding, recruitment, supervision, competencies, quality improvement, business continuity, reports, letters and checklists.

### 4.17 Reports — `/reports`

Reports use authorised, tenant-scoped database records.

Configured report families include:

- Monthly governance.
- Quality assurance.
- Audit.
- Risk.
- Action status.
- Complaints.
- Incidents.
- Safeguarding.
- Policy compliance.
- KPI.
- Inspection readiness.
- Evidence index.
- Board summary.

Capabilities include filters appropriate to each report, live summaries, drill-through links, print/PDF presentation and CSV-style exports where suitable. Generated outputs do not use placeholder findings as real operational content.

### 4.18 Activity Log — `/activity`

The Activity Log is an append-only governance and security trail for ordinary users.

It records relevant create, update, archive, upload, download/access, approval, status, export, login and administrative events with user, time, organisation, location and record identifiers. Before/after metadata is retained where implemented and appropriate. Users can filter the log and authorised users can export it. Ordinary users cannot edit activity entries.

### 4.19 Security & Integrations — `/assurance`

This module distinguishes controls implemented by QCGMS from controls the subscribing organisation or host must configure and evidence.

Capabilities include:

- Security and compliance assurance catalogue.
- Links to access settings, activity evidence and security evidence.
- Integration-readiness catalogue for Nourish, CareLens, CareNexus, Microsoft 365, HR/payroll, training and finance systems.
- Clear separation between a listed integration opportunity and an active supplier/API integration.
- Support for documenting information-governance, supplier approval, mapping and assurance prerequisites.

No supplier integration should be described as live unless API access, field mapping, security review and deployment configuration have actually been completed.

### 4.20 Settings — `/settings`

Settings provides organisation administration.

Capabilities include:

- Organisation details and policy-brand configuration.
- Upload and manage the organisation's authorised policy logo.
- Manage service locations, including archive/restore behaviour.
- Add users/members and deactivate/remove access.
- Assign a default role.
- Assign service-location scope.
- Apply standard or read-only access mode.
- Grant or remove individual structural permissions with checkboxes.
- View and manage licence allocation/count information.
- Ensure member access cannot exceed the organisation's purchased/available seats where enforced by the licensing workflow.
- Record administrative changes in the activity log.

## 5. Abi governance assistant

Abi is the in-application governance guide represented by a young Black female avatar.

Current capabilities include:

- Answer questions about what each QCGMS module does.
- Explain why a module or record matters in health and social care.
- Explain its relationship to CQC evidence and governance without predicting a rating.
- Provide professional next-step guidance.
- Offer permission-filtered links to the relevant page.
- Respect the user's current page as context.
- Show notifications for pending and overdue actions, workforce items, policy reviews, risks, meetings, evidence and KPI work.
- List and prioritise work, then offer a link rather than navigating without being asked.
- Reject empty or overly long questions at the server boundary.

Abi currently uses a deterministic, curated knowledge and routing engine. It is not an external generative-AI service, does not analyse uploaded documents and should not be represented as autonomous decision-making.

## 6. Cross-module synchronisation map

| Source | Destination or derived view |
| --- | --- |
| Policy | Evidence Library, Calendar, Inspection Centre, policy report, Activity Log |
| Register entry | Evidence Library, relevant KPI, Action Tracker, register report, Inspection Centre |
| Audit | Evidence Library, Action Tracker, audit report, Inspection Centre |
| Risk | Evidence Library, Action Tracker, Calendar, Dashboard, risk report |
| Action | Evidence Library, Calendar, Dashboard, Abi notifications, action report |
| Workforce record | Staff profile, training matrix, Evidence Library, Calendar, workforce KPI, Dashboard |
| Governance meeting | Evidence Library, Action Tracker, Calendar, monthly-governance report |
| KPI entry/return | KPI trends, location comparison, Dashboard, KPI and commissioner exports |
| Evidence | Requirement gap status, Inspection Centre, expiry calendar, Dashboard and reports |
| Assessment | Evidence Library, client profile, Risk Register/Action Tracker when escalated |

Synchronisation is intended to update one linked source-backed record, not create repeated uncontrolled copies.

## 7. Security, privacy and tenancy controls

Implemented design controls include:

- PostgreSQL-backed, revocable sessions.
- Signed, secure session cookie containing identifiers rather than role authority.
- Password hashing with bcrypt.
- Authentication rate limiting.
- Active user, active session and active membership checks.
- Server-side organisation resolution.
- Organisation ID on all business records.
- Service-location scoping where applicable.
- Central permission guards.
- Per-membership permission overrides and read-only mode.
- Cross-tenant record rejection in data-access and route logic.
- Zod validation at server boundaries.
- Private file-storage abstraction with local private storage in development and a private bucket binding in hosted environments.
- File type and size checks.
- No permanent public evidence URLs.
- Append-only activity records for ordinary users.
- Soft deletion/archive patterns for governance records.
- Production-safe error boundaries.

Operational controls such as backups, restore tests, malware scanning, MFA enforcement, device management, retention execution, Cyber Essentials and DSPT evidence remain partly dependent on the selected hosting environment and subscribing organisation.

## 8. Technology and deployment architecture

- Next.js 16 App Router and React 19.
- TypeScript with strict type checking.
- Tailwind CSS.
- PostgreSQL and Prisma 7 using the PostgreSQL driver adapter.
- Zod, bcryptjs and JOSE.
- Vitest unit/integration tests.
- Playwright browser tests.
- Next.js deployment or Vinext/Cloudflare-compatible build path.
- Private object-storage binding for hosted files, with a private local development fallback.

The browser calls server components or route handlers. The server validates the session, membership, permission and tenant scope before accessing Prisma/PostgreSQL. The proxy improves navigation but is not treated as the security boundary.

## 9. Principal database domains

The current Prisma schema contains relational models for:

- Organisations, locations, users, memberships, membership locations, roles, permissions, permission overrides and sessions.
- Policies and policy versions.
- Evidence and evidence versions.
- Audit templates, sections, questions, audits, responses and findings.
- Register definitions, entries, entry evidence and history.
- Risks, risk evidence and reviews.
- Actions, updates and evidence.
- Governance meetings, attendees, agenda items and evidence.
- Calendar items and reminders.
- KPI definitions, entries, monthly returns and KPI evidence.
- Compliance requirements and mappings to evidence, audits, registers and actions.
- Templates.
- Staff members, staff compliance records, training courses, training requirements and leave requests.
- Clients and automatic reference counters.
- Activity logs.

## 10. Current boundaries and known limitations

The following boundaries are important when explaining QCGMS:

- It does not certify CQC, UK GDPR, DSPT, Cyber Essentials or employment-law compliance.
- It does not predict an official CQC rating.
- It does not replace management accountability, legal advice, clinical judgement or validated specialist assessment tools.
- It is not a care-planning, eMAR, rostering, payroll, invoicing, staff-scheduling, family-portal or daily-notes product.
- Abi is a curated rules/knowledge assistant, not an external LLM and not a document-analysis engine.
- External care, HR, training, finance, Microsoft 365 and CQC integrations are not automatically live because they appear in the catalogue.
- Email/SMS reminders are not active; reminders are in-app.
- The visible location selector does not yet provide full interactive multi-location switching from the shell; access is still scoped server-side to assigned locations.
- Office/PDF behaviour may use print-ready browser output for some reports rather than a separately rendered binary PDF service.
- Private hosted file storage requires the production bucket binding and associated backup/retention configuration.
- Malware scanning is an integration point/operational requirement, not evidence of an active scanner in the current repository.
- Production readiness still depends on environment configuration, migration deployment, seed-data removal, secret management, backups, monitoring and successful checks in the target host.
- The README still describes an earlier foundation state and should not be used alone as the current feature inventory.

## 11. Guidance for ChatGPT or another support assistant

When answering questions about QCGMS:

1. Treat this report and the current source code as authoritative over earlier milestone descriptions.
2. Identify the user's role, assigned location and intended task before recommending a mutation.
3. Explain the relevant module, the source of its data, the normal workflow and the downstream modules it updates.
4. Link the user to the source record rather than telling them to enter the same information twice.
5. Never invent a KPI, finding, risk, action, evidence item, inspection result or regulatory conclusion.
6. Never describe an internal readiness status as an official CQC assessment or rating.
7. Prefer first name plus internal client/staff reference; avoid unnecessary sensitive personal data.
8. Explain that evidence must be attributable, current, reviewable and connected to the underlying governance record.
9. For urgent safeguarding, clinical deterioration or immediate danger, direct the user to the organisation's emergency and safeguarding procedures; do not rely on the software alone.
10. Do not navigate or change a record unless the user asked. Offer the correct page or link and explain what will happen there.
11. Respect permissions. A missing button may reflect read-only access, role permission or location scope.
12. Distinguish implemented integrations from future or configurable integrations.

### Suggested context prompt

> You are supporting users of QCGMS, the ATOM Quality, Compliance and Governance Management System for UK adult social care. Use the attached System Functionality Report as the product source of truth. Explain modules in plain professional language, identify the record that is the true data source, and show how it links to evidence, actions, calendar, KPI, inspection and reports. Do not invent operational data, claim compliance, predict CQC ratings, or perform an action the user did not request. Respect role, location and read-only restrictions. Where a user needs to enter information, guide them to the natural source form and explain what downstream views will update automatically.

## 12. Quality assurance note

This report describes functionality visible in the current source repository. It is not itself proof that every production deployment, button, environment variable or external service is working. Deployment acceptance should still include database migration validation, type checking, linting, unit tests, end-to-end tests, production build, permission testing, tenant-isolation testing and page-by-page user acceptance testing against the deployed environment.
