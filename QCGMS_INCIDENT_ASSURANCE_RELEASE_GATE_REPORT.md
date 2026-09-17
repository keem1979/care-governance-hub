# QCGMS Incident Assurance release-gate report

Date: 28 August 2026 (Europe/London)

## 1. Release decision

**PASS — validated local release candidate.** The complete release gate passed from the final source on fresh and immediately preceding schemas, in production build mode, and through signed-in desktop and mobile workflows. This report does not state that production has been migrated or published.

## 2. Existing architecture reused

Incidents remain `RegisterEntry` records under the existing `incidents` definition. The implementation reuses QCGMS authentication, permission and location scoping, the central Action lifecycle, the governed Evidence Library, register history, Activity Log, existing reports and responsive UI patterns. It does not create duplicate Incident, Action or Evidence sources of truth.

## 3. Schema and migration

Migration `20260828090000_incident_assurance_closed_loop` is migration 61. It adds:

- `IncidentInvestigation` for one proportionate, attributable investigation per Incident;
- append-only `IncidentAssuranceReview` decisions;
- `IncidentAssuranceReviewEvidence` links to canonical Evidence;
- restrictive organisation, location, Incident, user and Evidence relationships;
- indexes for tenant/status and Incident decision history;
- a shorter global initial Incident schema focused on immediate facts and statutory considerations.

The 61-migration fresh chain and 60→61 upgrade both passed. The upgrade fixture proved a legacy Incident and its JSON data remained intact, and no fabricated investigation or assurance decision was backfilled.

## 4. RM workflow

The workflow is now:

Incident facts → proportionate investigation → canonical Action where required → Action Evidence/verification/effectiveness → Incident Management Assurance Test → authorised closure or explicit not-assured decision.

Initial capture asks for Incident type, immediate response, verified harm position, emergency-service involvement and safeguarding/CQC/Duty of Candour decisions. Root cause, learning and detailed review are not forced into the first form.

## 5. Investigation

The investigation records factual chronology, information sources and limitations, person/representative involvement, immediate/contributing/system causes, root-cause conclusion where proportionate, notification rationale, learning and communication, affected governed records, outcome and a no-further-Action rationale where appropriate.

Moderate and above require completed factual investigation, notification rationale, involvement, learning and outcome. High/Critical also require root-cause conclusion and affected-record review. Closed Incidents cannot be amended through the investigation API until formally reopened. Every amendment records previous and current investigation content in governed history.

## 6. Incident → central Action

The RM deliberately opens the existing Action creation workflow from the Incident. QCGMS pre-populates the source reference/backlink, title, description, location, suggested owner/oversight, priority, due/review dates, expected outcome, success measure, immediate response and escalation context. The RM reviews and changes these values before creation.

The implementation uses the existing `Action` record with `sourceType = INCIDENT` and `sourceRecordId = Incident.id`. No Incident-specific Action table, status or evidence lifecycle was introduced. Existing-Action linking is deliberately not claimed in the UI; that needs the later governed relationship architecture.

## 7. Completion versus effectiveness

Action completion does not close the Incident. For High/Critical Incidents, every closed linked Action must also have a latest `EFFECTIVE` effectiveness decision before Incident assurance can pass. Reopening or closing the Incident does not alter linked Action history or status.

## 8. Management Assurance Test

The test returns readiness plus reasons, never a percentage. It checks immediate safety response, verified harm, statutory decisions, investigation depth, notification rationale, root cause, involvement, learning, affected records, treatment path, unresolved Actions, Action effectiveness, investigation outcome and sufficient appropriate closure Evidence.

Low Incident closure is proportionate: a permitted manager may rely on an accountable rationale where separate closure Evidence is not reasonably required. Moderate and above require governed closure Evidence. The existence of a document is not described as proof that care was safe or that a control worked.

## 9. Authority and lifecycle

Closure requires `GOVERNANCE_EDIT` plus an authorised provider role for the Incident level. Critical closure also requires a decision maker separate from the Incident creator and investigator. The current clean implementation records one authorised closure decision; dual approval for Critical Incidents is not implemented and should be considered alongside the future provider-configurable Incident authority policy.

Generic register editing cannot set an Incident to Closed or reopen it. A closed Incident cannot receive a not-assured decision without first being formally reopened. Closure of an Incident never closes related Actions, Risks, Safeguarding records, Complaints or Audits.

## 10. Evidence and provenance

Closure Evidence is selected from active, tenant/location-scoped canonical Evidence and linked to the exact append-only assurance review. The decision retains reviewer role, Incident risk level, rationale and the full readiness-check snapshot. A future enhancement may require current independent Evidence verification for provider-configured Incident categories/levels rather than imposing it on every Incident now.

## 11. Permissions and isolation

All new reads and writes reuse server-side capability, tenant and authorised-location scopes. The signed-in gate proved cross-tenant and out-of-location Incident reads and assurance mutations return not found. The local E2E setup endpoint remains unavailable unless the compiled application has the explicit release-gate flag and the caller supplies the setup token.

## 12. Browser and mobile validation

The signed-in RM scenario proved:

- an effective closed Action leaves its Incident in review;
- generic closure is blocked;
- an open Action blocks Incident closure;
- sufficient Evidence plus investigation and effective Action permits authorised closure;
- investigation changes and a contradictory not-assured decision are blocked while closed;
- formal reopening succeeds without changing Action status/effectiveness;
- tenant and location boundaries hold;
- investigation and assurance controls have no horizontal mobile overflow and remain touch-usable.

Final result: desktop 6/6 and mobile 3/3 across the combined Action, Audit and Incident assurance gate.

## 13. Automated validation

- Prisma schema validation: PASS
- Prisma client generation: PASS
- Fresh 61-migration chain: PASS
- 60→61 upgrade and legacy preservation: PASS
- Seeded schema proof: PASS
- TypeScript: PASS
- ESLint: PASS
- Vitest: 70 files / 344 tests, all PASS
- Production Next.js build: PASS
- Signed-in desktop Playwright: 6/6 PASS
- Signed-in mobile Playwright: 3/3 PASS
- Evidence search probe: approximately 6–7 ms execution at 5,000 synthetic rows
- `git diff --check`: PASS
- Vinext/Sites build: PASS

Vinext reported its existing non-blocking future native-config warnings and unknown static route classification. The policy-branding logo endpoint remains a runtime API reference as designed; no packaging error occurred.

## 14. Deliberately not built

- no duplicate Action, Evidence, Risk or Incident lifecycle;
- no automatic safeguarding, CQC, Duty of Candour or professional conclusion;
- no automatic Incident closure from Action completion;
- no automatic related-record closure;
- no broad generic relationship table with unvalidated IDs;
- no invented AI root-cause or risk decision;
- no universal independent-evidence rule that burdens every Low Incident.

## 15. Repository and deployment state

- Committed: No
- Pushed: No
- Production database migrated: No
- Published: No

The migration and application are a validated local release candidate only until production migration and deployment are explicitly performed.

## 16. Technical concerns and next phase

- Provider-configurable Incident closure authority/independence is not yet versioned like the Risk Framework and Action Assurance policy.
- Existing-Action linking requires the planned controlled hybrid governance-relationship architecture; overloading source fields would lose source integrity.
- Provider rules may later require current verified Evidence for particular Incident categories/levels.
- Formal keyboard and assistive-technology testing remains outstanding.

**Recommended next module: Complaints Assurance.** It can reuse acknowledgement, investigation, central Action, outcome/response, recurrence, learning, Evidence and authorised closure while preserving complaint and Action lifecycles. Safeguarding should follow only after its escalation and authority decisions are agreed because it carries greater safety and statutory sensitivity.
