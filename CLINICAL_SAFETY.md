# Clinical safety management plan and initial hazard record

Status: **controlled product process; named Clinical Safety Officer acceptance is
required before live use**.

QCGMS supports governance and controlled care-plan information but does not make
clinical decisions, diagnose, prescribe, administer medicines or replace immediate
care records. Human professionals remain responsible for assessment, approval,
communication and action. DCB0129 applicability and the deployed clinical-safety
case must be confirmed by a competent Clinical Safety Officer.

Each material change requires intended-use and foreseeable-misuse review, hazard
analysis, risk control, test evidence, residual-risk decision, release approval
and post-release monitoring. Safety defects override feature deadlines.

| ID | Hazardous situation | Initial severity | Product controls | Current status |
| --- | --- | --- | --- | --- |
| H-001 | Wrong person's records are viewed or updated | High | Tenant/location checks, client identifiers, no automatic ambiguous merge, negative isolation tests | Controlled in build; independent test pending |
| H-002 | Staff act on draft or superseded care instructions | High | Controlled version/status model, human approval and current-version presentation | Controlled in build; workflow validation pending |
| H-003 | Material change is not communicated or acknowledged | High | Version comparison, assignments and acknowledgement requirement | Controlled in build; end-to-end validation pending |
| H-004 | Outage hides time-critical information | High | QCGMS is not the sole point-of-care record; downtime, restore and reconciliation plan required | Operational evidence pending |
| H-005 | Dashboard or AI output is treated as fact without evidence | High | Provenance, human decision, uncertainty/escalation rule and no autonomous care action | Phase 9 controls built; independent evaluation pending |

No hazard may be accepted by the developer alone. A named owner must record
severity, likelihood, control evidence, residual risk, affected release and
acceptance. Any uncontrolled high-severity hazard blocks live release.
