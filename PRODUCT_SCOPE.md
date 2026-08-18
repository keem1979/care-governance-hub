# QCGMS Product Charter

## Product position

QCGMS is the continuous governance, assurance and action-closure platform for
UK adult social care. It helps Registered Managers, Responsible Individuals,
provider owners and quality leaders see what is unsafe, overdue or unverified
and demonstrate that improvement has been completed and sustained.

QCGMS complements digital care records, eMAR, rostering, HR and finance
systems. It is not intended to replace them.

## Primary customers and users

The first market is independent adult social care providers operating roughly
one to twenty locations across domiciliary care, supported living, residential
care and related community services.

Primary users are Registered Managers and deputies; Responsible or Nominated
Individuals and owners; quality, compliance and operations leaders; and
authorised auditors, consultants and staff contributors.

## Product promise

The system must help an authorised manager answer:

1. What is unsafe, overdue, incomplete or awaiting a decision?
2. Who owns each response and when is it due?
3. What evidence demonstrates that the response was completed?
4. Who independently verified it and was it effective?
5. Has the same problem happened again?
6. Can the organisation produce a traceable evidence narrative for scrutiny?

The primary assurance chain is:

```text
Issue identified -> risk controlled -> action assigned -> evidence submitted
-> independently verified -> effectiveness measured -> recurrence monitored
```

## Product principles

- One authoritative record for each important person, worker, location and governance object.
- Record once and link everywhere; do not create conflicting copies between modules.
- No high-risk closure without evidence, authority and verification.
- Important changes identify connected records that may require review.
- Provider judgement remains visible and accountable; automation does not hide it.
- Evidence must be attributable, current, relevant and verifiable.
- Regulatory frameworks are versioned configuration, not hard-coded assumptions.
- Data minimisation, tenant isolation, accessibility and auditability are defaults.
- AI must cite authorised sources or escalate uncertainty.
- The product never predicts or guarantees a regulator rating or outcome.

## UK regulatory scope

The core platform must support configurable frameworks for the Care Quality
Commission in England, Care Inspectorate in Scotland, Care Inspectorate Wales,
the Regulation and Quality Improvement Authority in Northern Ireland, and local
authority, commissioner or organisation-specific assurance frameworks.

Framework content must carry jurisdiction, service applicability, version,
effective date, publication status and change history. Qualified review is
required before regulated content is presented as current.

## Canonical domains

The canonical model is defined in `DATA_MODEL.md`. The principal domains are:

- Organisation, location, membership, role and delegation.
- Person receiving support and authorised representative.
- Staff member, training, competency, supervision and workforce evidence.
- Commissioner, external professional and external dependency.
- Care plan, review, assessment, material change and acknowledgement.
- Finding, risk, action, verification, effectiveness and recurrence.
- Incident, complaint, safeguarding and operational register entry.
- Evidence, document, policy, template and provenance.
- Audit, assurance test, inspection simulation and regulatory requirement.
- Governance meeting, decision, improvement plan and outcome measure.
- Calendar obligation, notification, integration event and reconciliation case.

## In scope

- Multi-tenant authentication, permissions and location scope.
- Controlled client and workforce directories.
- Governed care plans, reviews, versions, approvals and staff quick guides.
- Policies, evidence, audits, registers, risks, actions and improvement plans.
- Workforce checks, training and competency assurance.
- Governance meetings, decisions, calendars, KPIs and reports.
- UK-wide internal inspection-readiness frameworks and mock inspections.
- Evidence provenance, validity, verification and export.
- External-dependency, recurrence and effectiveness monitoring.
- Safe imports, reconciliation and future integration interfaces.
- Source-cited governance assistance with human escalation.

## Deliberately out of scope

- eMAR and medicines administration.
- Rostering, payroll, invoicing, credit control and staff scheduling.
- Electronic visit monitoring and frontline daily care notes.
- Automated allocation of staff to visits.
- Family portals and consumer messaging.
- Automated clinical, safeguarding or legal decisions.
- Official regulator integrations without an approved assurance route.
- Claims of compliance, certification, inspection outcome or regulator endorsement.
- Native mobile applications until the web platform and offline safety model are proven.

## Care-plan boundary

Care plans are in scope as controlled governance records: assessment context,
approved instructions, structured review, material-change control, version
comparison, publication, acknowledgement and outcome monitoring. QCGMS is not a
replacement for real-time point-of-care recording, eMAR or visit delivery.

## Release sequence

- **Release A - RM Governance Core:** Phases 0-4 cover product architecture,
  security and clinical safety, canonical data, assurance closure, recurrence,
  improvement plans and management command views.
- **Release B - Care Assurance Operating Layer:** Phases 5-7 cover controlled
  care changes, workforce matching, evidence provenance, UK regulatory
  frameworks, meetings, decisions and commissioner governance.
- **Release C - Connected Governance Platform:** Phases 8-10 cover reconciled
  integrations, safe Abi, offline evidence capture, configurable workflows and
  implementation assurance.
- **Validated launch:** Phase 11 requires external beta evidence, measurable
  outcomes, service operations and commercial readiness.

## Phase 0 completion criteria

- This charter is the controlling product boundary.
- Canonical entities and ownership rules are documented.
- Regulatory frameworks are separated from core product logic.
- Every current module maps to the assurance chain.
- Product and customer outcome measures have defined calculations.
- Public messaging describes continuous assurance rather than generic compliance.
- Contradictory early-MVP instructions are removed from agent guidance.
- Later phases remain gated and are not implied to be complete.
