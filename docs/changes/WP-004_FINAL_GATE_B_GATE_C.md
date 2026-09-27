# WP-004 — Gate B / Gate C Product Owner evidence pack

**Branch:** `wp-004-action-assurance-simplification`  
**Implementation HEAD:** `e99ca2d`; the final documentation commit is listed by Git and in the delivery message.  
**Base:** approved local WP-003 merge `4080eeac880ce3f4f05841dee6caaf5a8cf1da3e`  
**Working tree:** clean at report preparation  
**Status:** **BLOCKED — browser Gate B and rendered Gate C remain outstanding.**

## Delivered

Commits since the WP-003 merge:

1. `eb41b77` — Simplify Action completion and assurance forms.
2. `f29d82a` — Add owner-to-manager Action lifecycle browser spec.
3. `e99ca2d` — Enforce Action assurance stages and Evidence eligibility; add disposable local gates and change record.

The visible current-work area now offers **What did you do? + Completion Evidence → Submit for verification**. Progress is separate. Verification has an explicit outcome, evidence selection, result against the success measure and rationale, with the completion account and Evidence titles derived from canonical records. Effectiveness has an explicit outcome, observed result, Evidence, recurrence choice and management decision. A recurrence requires a real immediate-control and escalation account. Authorised closure remains separate.

Changed product areas: Action detail and assurance pages, Action controls and advanced edit form, Action create/update/Evidence-link/verification/effectiveness/closure/root-cause/dependency routes, contextual Action Evidence route, and shared Action validation. Changed tests/harness: Action helper unit tests, existing Action browser selectors reflecting the new UI, new WP-004 lifecycle E2E spec, named disposable database migration gate, direct-request gate and 5,000-record Evidence probe. The exact tracked file list is available with `git diff --name-only 4080eea HEAD`. No generated Playwright or build output is committed.

## Gate B — engineering assurance

| Check | Result | Evidence |
| --- | --- | --- |
| Unit/integration | **PASS — 385/385**, 77 files | Final `npm.cmd run test` on current code. |
| TypeScript | **PASS** | Final `npm.cmd run typecheck`. |
| ESLint | **PASS** | Final `npm.cmd run lint`. |
| Prisma validation | **PASS** | `npm.cmd run db:validate`. |
| Fresh disposable migration path | **PASS — 65/65** | Temporary schema inside `127.0.0.1:5432/care_governance_hub_test`; verified five canonical Action/assurance tables and dropped the schema. |
| Existing test DB migration status | **PASS** | 65 migrations found; disposable database schema up to date. WP-004 has **no new migration**. |
| Next.js production build | **PASS** | Final `npm.cmd run build:next`. |
| Sites/Vinext production build | **PASS** | Final `npm.cmd run site:build`. |
| Authenticated direct-request security/integrity | **PASS — 27/27** | Fictional accounts and data in the named disposable PostgreSQL database; no production access. |
| Evidence search scale | **PASS — 5,000 fictional records** | Search 4.437 ms; paged listing 8.915 ms; fixture transaction rolled back. |
| Browser regression | **BLOCKED** | Playwright reached the local server, then Chromium launch failed `spawn EPERM` before application assertions. Attempted spec: 0 passed, 1 infrastructure failure. Existing Action desktop/mobile regressions remain unrun in an unrestricted environment. |

The direct-request gate checked tenant concealment; location-restricted writes to branch and organisation-wide Actions; wrong-branch and archived Evidence rejection for completion and role links; missing completion account/Evidence; general create/edit bypasses; accepted canonical Completion Evidence without automatic verification or closure; explicit recurrence choice; owner self-verification denial; premature closure denial; and closed Action archive/restore denial. This is 27 checks total, including four fictional sign-ins.

The fresh migration script used a new temporary PostgreSQL schema within the named disposable test database and removed that schema afterward. The full independent PostgreSQL release-gate wrapper could not start a second cluster inside this sandbox (`pg_ctl` restricted-token error); its database-only option was discarded. The successful isolated-schema migration run is the WP-004 fresh-path evidence. The existing test DB is disposable and contains fictional fixtures only.

## Gate C — RM experience

**Code-inspected, not browser-measured:** previous completion used three visible inputs (note, percentage, Evidence); the new routine completion form uses two (account, Evidence), or one entry if eligible Completion Evidence is already linked. Previous verification used eight interactive controls, including two duplicate narratives; the new primary form has five interactive controls plus a read-only verifier. Previous effectiveness showed eleven controls; the new primary form shows six, with explicit outcome and recurrence choices. The explicit human choices can increase clicks while reducing visible fields. No actual before/after click measurement is claimed.

**Rendered desktop/mobile review:** pending. The WP-004 browser spec is prepared to capture `wp004-completion-submitted.png`, `wp004-verification-recorded.png`, and `wp004-effectiveness-reviewed.png` per project. None exists yet. The only persisted attempted-run artifact is the Chromium infrastructure error context at `outputs/WP-004_GATE_C/chromium/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-chromium/error-context.md`.

## Specialist verdicts

| Specialist | Verdict |
| --- | --- |
| RM Advocate | PASS, source review; rendered confirmation pending. |
| UX Designer | PASS, source review; rendered confirmation pending. |
| Form Simplicity Specialist | PASS, source review; actual burden measurement pending. |
| Plain Language Reviewer | PASS, source review. |
| Evidence Experience Specialist | PASS, source review of canonical Evidence and purpose-specific links. |
| Security/Tenancy Reviewer | PASS after correction; read-only code review plus lead's 27/27 direct gate. |
| Governance QA Consultant | PASS on code, release gate pending. |
| CQC-style Inspector review | PASS on evidence design with observation-period caution; no regulatory endorsement. |
| Accessibility/Mobile Reviewer | PASS static; rendered/mobile verdict pending. |
| Test Engineer | Lifecycle spec prepared; Chromium launch blocked before assertions. |
| Release Manager | **HOLD — NOT READY FOR PRODUCT OWNER REVIEW.** |

## Known follow-ups and decision

- Existing `atom-wordmark.png` aspect-ratio console warning is a separate non-blocking issue.
- Vinext reports an existing future native Vite-config compatibility warning, without failing the build.
- Native multi-select Evidence controls need live mobile usability review.
- The provider should ensure “sustained improvement” is backed by a meaningful observation period; the code does not impose a universal interval.

**Gate B: BLOCKED** until signed-in Chromium and mobile tests pass.  
**Gate C: BLOCKED** until authenticated screenshots and actual before/after burden measurements are recorded.  
**Final WP-004 verdict: BLOCKED — NOT READY FOR PRODUCT OWNER REVIEW.**  
No merge, remote push, deployment, production database or production data access occurred.

