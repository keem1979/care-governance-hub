# QCGMS Complaints Assurance Release-Gate Report

Date: 28 August 2026
Branch: `phase-11-validated-launch`
Scope: local release candidate only

## 1. Release Decision

**LOCAL RELEASE GATE: PASS.**

The Complaints Assurance slice is coherent and suitable to be committed as part of the current release candidate. It has not been pushed, deployed or applied to the production database in this task.

The release preserves the existing Incident Assurance candidate and reuses the central Register, Action, Evidence, Calendar, My Work, dashboard, KPI and reporting architecture.

## 2. Existing Capability Reused

- `RegisterEntry` and the published `complaints` definition remain the canonical Complaint record.
- The existing organisation, location, membership, permission and scope helpers control every read and mutation.
- Corrective work uses the existing central `Action` lifecycle with `sourceType = COMPLAINT`.
- Governed documents continue to use canonical `Evidence` and its existing provenance, version and verification controls.
- Existing `RegisterEntryHistory` and `ActivityLog` provide attributable case history.
- Existing Calendar, My Work, management dashboard, KPI synchronisation and report infrastructure are extended rather than duplicated.
- Existing organisation document branding supplies the printable Complaint Assurance record.

## 3. Existing Capability Improved

- Initial Complaint capture is now deliberately short and safety-focused.
- Generic Complaint editing is limited to canonical identity, scope, ownership and risk; workflow fields are maintained in the governed case extension.
- Generic status editing can no longer close or reopen a Complaint.
- Complaint rows in My Work now use typed acknowledgement/response deadlines and include the assigned investigator.
- The shared Calendar now projects acknowledgement and response/extension deadlines.
- The management dashboard now surfaces overdue acknowledgement, overdue response, response-issued cases awaiting assurance and reopened Complaints.
- The existing Complaint report projection now includes issues, findings, deadlines, Actions and assurance exceptions.
- KPI synchronisation now calculates on-time responses and on-time Complaint Action completion only from complete, reliable workflow facts.

## 4. New Capability Added

- Progressive one-to-one `ComplaintInvestigation` case control.
- Multiple `ComplaintIssue` records with human findings, rationale and governed Evidence links.
- Append-only `ComplaintCommunication` chronology covering acknowledgement through post-response information.
- Attributable final-response preparation and approval, including separate approval for a Critical Complaint.
- Deliberate issue-aware handoff to one canonical Action lifecycle.
- Reason-led Management Assurance using the shared `managementAssuranceTest()` result model.
- Proportional Low/Moderate/High/Critical readiness and closure authority.
- Append-only `ComplaintAssuranceReview` decisions and Evidence links.
- Formal reopening that preserves the original closure decision and records material new information.
- A premium organisation-branded printable Complaint Assurance record.

## 5. Architectural Decisions and Pushback

- No Complaint-specific Action model was created. One central Action can serve reporting, My Work, calendar, verification, effectiveness and improvement planning.
- Action completion does not change Complaint status. Verification and effectiveness remain separate, and Complaint closure requires a new authorised human decision.
- No universal acknowledgement or response period is invented. The provider records the applicable policy/agreed deadline; missing dates remain visibly missing.
- No fuzzy recurrence classifier was introduced. Recurrence remains a recorded management judgement supported by controlled category/location information.
- No loose Complaint-to-Risk identifier was introduced. Referentially safe cross-domain relationships remain a separate architectural decision.
- Complainant satisfaction is recorded as experience evidence but is not a closure or investigation-quality test.
- A numeric assurance percentage was rejected. The result is ready/not ready with explicit reasons.

## 6. Reuse and Upgrade Summary

| Governance need | Implementation |
| --- | --- |
| Initial concern | Canonical `RegisterEntry` |
| Investigation | One typed `ComplaintInvestigation` |
| Multiple allegations | `ComplaintIssue` children |
| Finding Evidence | Canonical `Evidence` through `ComplaintIssueEvidence` |
| Acknowledgement/response history | Append-only `ComplaintCommunication` |
| Improvement work | Existing central `Action` |
| Verification/effectiveness | Existing Action Assurance records |
| Closure/reopening | Append-only `ComplaintAssuranceReview` |
| Due-date oversight | Existing Calendar and My Work |
| Management exceptions | Existing dashboard projection |
| Reports | Existing report engine plus branded case report |

## 7. Schema and Migrations

Migration added: `20260828130000_complaints_assurance_closed_loop`.

New models:

- `ComplaintInvestigation`
- `ComplaintIssue`
- `ComplaintIssueEvidence`
- `ComplaintCommunication`
- `ComplaintAssuranceReview`
- `ComplaintAssuranceReviewEvidence`

New enums cover investigation status, issue findings, communication type/direction and assurance decision.

Exact migration results:

- Fresh database: **62/62 migrations applied**.
- Previous release shape: **61/61 migrations applied**, legacy Complaint fixture inserted, then migration 62 applied successfully.
- Deployment seed: **62/62 migrations plus seed passed**.
- Referential constraints and oversight indexes were verified by SQL assertions.

## 8. Legacy Preservation

- Original Complaint `RegisterEntry.data` JSON is not overwritten.
- Existing complainant name, category, investigator text, response target, outcome and learning are copied into the typed extension where deterministic.
- A valid historical acknowledgement date becomes one attributable append-only acknowledgement event.
- Invalid or missing legacy dates are not invented.
- The 61→62 upgrade proof confirmed byte-equivalent JSON meaning and exact mapped values.

## 9. Governance Controls

- Acknowledgement, investigation completion, response issue, Action completion, effectiveness and Complaint closure remain distinct states.
- Material findings require governed Evidence; material final responses retain the response document.
- Required improvement cannot remain only in issue prose: readiness requires a central Action path.
- Serious Complaint Actions must be closed with an Effective outcome before Complaint assurance can be ready.
- High/Critical responses require attributable approval; Critical response approval must be separate from the investigator.
- Critical closure requires an authorised closer who neither created nor investigated the Complaint.
- Generic closure and closed-record investigation/communication changes are rejected server-side.
- Reopening requires material new information and appends, rather than overwrites, governance history.
- Related records retain independent lifecycles.

## 10. Security

The signed-in browser gate proved:

- cross-tenant Complaint read is denied;
- cross-tenant Complaint assurance mutation is denied;
- unauthorised-location Complaint read is denied;
- unauthorised-location Complaint assurance mutation is denied;
- direct identifier manipulation returns not found rather than bypassing scope;
- selected Evidence is revalidated against active, authorised Evidence scope;
- active organisation membership is required for investigator assignment;
- production does not receive the test-only setup environment or token.

## 11. Automated Validation

- Prisma validation: **passed**.
- TypeScript: **passed**.
- ESLint: **passed, zero warnings**.
- Unit/integration tests: **72 files, 351 tests passed**.
- Fresh migrations: **62/62 passed**.
- Previous-version upgrade: **61→62 passed**.
- Seed proof: **passed**.
- Full signed-in desktop gate: **7/7 functional scenarios passed** across Action, Audit, Incident and Complaint Assurance. One first-attempt Windows loopback navigation was retried; the helper was then narrowed to retry only `ERR_NETWORK_IO_SUSPENDED`.
- Final targeted Complaint desktop rerun after that hardening: **1/1 passed without retry**.
- Full mobile gate: **4/4 passed**.
- Final targeted Complaint mobile rerun: **1/1 passed**.
- Negative assurance tests cover unresolved Actions, missing Evidence, ineffective Action outcome, generic closure bypass, closed-record changes, Critical self-approval and cross-scope mutations.

## 12. Build Validation

- Production Sites/Vinext build: **passed**.
- Production-mode Next build used by authenticated E2E: **passed**.
- Complaint APIs and branded report routes were included in both build route manifests.
- The existing Vite native-config future-warning and runtime-resolved branding-logo URL remain non-blocking pre-existing build notices.

## 13. Performance Validation

A disposable 5,000-Complaint/5,000-investigation probe confirmed the tenant/deadline index is used.

Latest representative local results:

- overdue acknowledgement aggregation: approximately **1.2 ms** execution;
- controlled issue theme aggregation: approximately **0.6 ms** execution;
- existing 5,000-row Evidence search: approximately **3.6 ms**;
- existing large Evidence option projection: approximately **4.8 ms**.

These are local database measurements, not production service-level guarantees.

## 14. Known Limitations / Deliberate Deferrals

- Provider-configurable Complaint closure authority is not yet a separate versioned policy. This release uses the smallest defensible existing role/risk model.
- Complaint deadlines are explicitly recorded; a future provider configuration may propose dates, but must not pretend one universal timescale applies.
- Recurrence is not automatically inferred from narrative similarity. The system records category/location facts and the manager's rationale.
- A Complaint Action is referentially linked to the Complaint. The selected issue is preserved in proposed wording/issue key, but a broad cross-module relationship layer was deliberately not introduced.
- Complaint-to-Risk linkage remains deferred until the shared tenant-safe relationship architecture is agreed.
- The dashboard “awaiting assurance” signal means investigation complete plus response issued; the Complaint page remains the authoritative reason-led readiness test.

## 15. Production Deployment Status

**Not deployed.**

- No production migration was applied.
- No commit was created.
- No branch was pushed.
- No Sites release was published.

The next controlled step is to review this local release candidate, then commit/push/publish only when separately authorised.
