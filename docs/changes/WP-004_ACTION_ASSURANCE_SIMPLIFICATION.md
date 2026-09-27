# WP-004 — Action completion, verification and effectiveness simplification

## Scope and architecture

Branch: `wp-004-action-assurance-simplification`, based on the approved local WP-003 merge `4080eeac880ce3f4f05841dee6caaf5a8cf1da3e`.

The canonical Action, Evidence, ActionEvidence, Verification, EffectivenessReview and ActivityLog records remain in use. WP-004 adds no schema migration. Completion, verification, effectiveness and closure remain separate attributable decisions.

The Action detail now puts **Submit completed work for verification** in current work. The owner enters **What did you do?** and selects eligible Completion Evidence; a previously linked eligible Completion Evidence record can be reused. Ordinary progress is a separate form and cannot claim 100% completion. Once completion is submitted, the manager sees the recorded account rather than retyping it. Verification asks for an explicit outcome, linked Evidence checked, result against the success measure and rationale. Effectiveness asks for an explicit outcome, observed result, Evidence, recurrence decision and management decision; baseline/target details remain available under disclosure. A recurrence requires actual immediate-control and escalation accounts. Closure remains a separate authorised step.

The server requires a substantive completion account and active, non-archived Completion Evidence in the Action's location or organisation-wide scope. The same Evidence eligibility is enforced when linking, verifying, reviewing effectiveness and closing. Closed and archived Action write protection, tenant/location permissions, provider verification policy, separate verifier rules, role-aware Evidence links and ActivityLog remain server-side. General create/edit routes cannot assert 100% completion without the completion step.

## Specialist code reviews

| Review | Verdict | Scope |
| --- | --- | --- |
| RM Advocate, UX, Form Simplicity, Plain Language | PASS | Source review of the concise current-work and decision forms; rendered review pending. |
| Evidence Experience | PASS | One canonical Evidence record and purpose-specific ActionEvidence links; no wording equates attachment with sufficiency. |
| Security/Tenancy | PASS | Code review after location, archived Evidence and closed-record corrections; lead ran direct-request gate. |
| Governance QA and CQC-style evidence review | PASS, release gate pending | Attributable stages and history preserved; no regulator endorsement claimed. |
| Accessibility/Mobile | PASS static, rendered pending | Labelled controls, text status, touch targets and responsive layout reviewed in code; native mobile multi-select requires live review. |
| Test Engineer | Spec prepared | New owner-to-manager lifecycle E2E spec includes integrity assertions and screenshot capture; browser launch blocked in sandbox. |
| Release Manager | HOLD | Gate B browser and Gate C rendered evidence remain outstanding. |

## Burden evidence

These are source-inspected counts, **not rendered interaction measurements**. The existing progress form had three visible inputs (note, percentage, Evidence) plus Save. The new routine completion form has two visible inputs (account, Evidence) plus Submit; with already linked eligible Completion Evidence, only the account is entered. The earlier verification form had eight interactive controls including duplicate completion and Evidence-summary narratives. The new primary verification form has five interactive controls plus a read-only verifier; the duplicate narratives are available only for legacy correction. The earlier effectiveness form had eleven controls; the new primary form has six, with explicit outcome and recurrence choices. The shorter form reduces field burden while the explicit decisions increase the minimum clicks for an effective outcome. Browser-measured clicks, fields and screenshots must be added after the unrestricted E2E run.

## Gate evidence and current hold

- Automated unit/integration suite: **385/385 PASS**, 77 files.
- TypeScript, ESLint and Prisma validation: **PASS**.
- Next.js and Sites/Vinext production builds: **PASS**. Vinext emitted its existing Vite native-config compatibility warning; it did not fail the build.
- Fresh migration path: **65/65 migrations PASS** in a temporary schema within the named disposable local PostgreSQL test database; the schema was dropped afterward. Existing named test database migration status is current. **WP-004 schema migration: no.**
- Authenticated direct requests against the disposable test database: **27/27 PASS**, including tenant/location denial, archived and wrong-location Evidence denial, completion integrity, separate decisions, closed archive/restore protection and premature closure denial.
- Evidence search performance: **5,000 fictional rows**, search **4.437 ms**, page **8.915 ms**, rolled back afterward.
- Browser: `wp004-action-lifecycle.spec.ts` Chromium launched the local server but Playwright's browser process failed with `spawn EPERM` before assertions. **0 passed, 1 environment-blocked/failed**. Mobile and the existing Action browser regressions have not been run in the unrestricted runtime.
- Screenshots and rendered burden measurements: **pending**. No screenshot file is claimed.

Known non-blocking follow-ups: existing `atom-wordmark.png` aspect-ratio warning; Vinext/Vite native-config warning; check the native Evidence multi-select on a real mobile viewport; ensure any use of “sustained improvement” reflects a meaningful observed period under provider policy. None is treated as a browser PASS.

**Current verdict: BLOCKED — browser Gate B and rendered Gate C outstanding. No merge, push, deployment or production access.**
