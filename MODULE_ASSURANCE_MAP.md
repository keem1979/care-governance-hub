# Module to Assurance Map

This map prevents QCGMS becoming a collection of disconnected forms. Each
module must contribute to at least one stage of the assurance chain and link to
the canonical record rather than hold an ungoverned duplicate.

| Module | Authoritative purpose | Assurance contribution | Must link to |
| --- | --- | --- | --- |
| Dashboard | Prioritised management exceptions | Identifies unsafe, overdue and unverified work | Every underlying source record |
| Client Directory | Controlled person identity and relationships | Prevents conflicting person records | Care plans, reviews, assessments, incidents, evidence |
| Care Plans | Current approved care instructions and history | Controls material change, publication and acknowledgement | Person, risks, reviews, competencies, evidence |
| Policies | Current approved organisational controls | Defines expected process and control | Templates, audits, actions, training, framework requirements |
| Evidence Library | Authoritative evidence provenance and versions | Supports verification and currency | Findings, actions, requirements, decisions, outcomes |
| Audit Centre | Structured tests and findings | Identifies strengths, exceptions and actions | Requirements, evidence, risks, actions |
| Assessment Centre | Structured assessment conclusions | Identifies needs, risks and dependent reviews | Person, care plan, risk, evidence |
| Registers | Authoritative operational events | Creates findings, learning and notifications | Person, staff, action, evidence, external bodies |
| Risk Register | Risks, controls and reviews | Records immediate control and residual exposure | Findings, actions, decisions, evidence |
| Action Tracker | Universal improvement lifecycle | Assigns, evidences, verifies and monitors improvement | Every source, evidence, verifier, outcome |
| Workforce | Staff identity, checks and competency | Assures safe authority and capability | Location, care requirements, actions, evidence |
| Care Quality | Outcome and experience oversight | Tests whether change improved care | People, reviews, feedback, KPIs, improvement plans |
| Governance Meetings | Formal review, challenge and approval | Records oversight and changes accountability | Findings, risks, actions, decisions, KPIs |
| Calendar | One schedule of governed obligations | Makes due, overdue and escalation events visible | All dated governed records |
| KPI Suite | Defined performance measures and returns | Shows trend and outcome without invented data | Source records, location, evidence, owner |
| Inspection Centre | Configurable internal framework assurance | Samples and assembles current evidence | Framework version, requirements, records, evidence |
| Templates | Controlled forms and working documents | Standardises evidence collection | Policy, framework, owner, version and approval |
| Reports | Authorised evidence narratives | Communicates traceable management assurance | Live records and generation history |
| Activity Log | Append-only event chronology | Demonstrates who did what and when | User, tenant, record and session where appropriate |
| Security & Integrations | Control evidence and connection readiness | Separates active controls from planned assurance | Settings, activity, integration and security evidence |
| Settings | Organisation, location, authority and safe configuration | Controls scope, permissions and governance defaults | Configuration version and change approval |
| Abi | Source-cited navigation and drafting assistance | Explains, summarises or escalates; never approves | Authorised records, policies, guidance and audit log |

## Duplicate prevention rules

- Person and staff identity belong to their directories; modules reference them.
- An action has one universal lifecycle regardless of originating module.
- Evidence has one provenance record and may be linked to many governed records.
- A regulator requirement belongs to one versioned framework.
- A material decision belongs to the decision register and may be referenced elsewhere.
- Dates create calendar obligations; modules do not maintain separate reminder truth.
- Reports are generated views and must not become a second operational record.
