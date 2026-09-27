# WP-004 — Gate B / Gate C Product Owner evidence pack

**Branch:** `wp-004-action-assurance-simplification`  
**Validated code HEAD:** `fffa530e41f2f53884408a4c4c96dfb4a9bec882`; the final documentation commit is listed by Git and in the delivery message.  
**Base:** approved local WP-003 merge `4080eeac880ce3f4f05841dee6caaf5a8cf1da3e`  
**Working tree:** clean at report preparation  
**Status:** **BLOCKED — focused Chromium rerun and mobile Gate B/Gate C remain outstanding.**

## Delivered

Commits since the WP-003 merge:

1. `eb41b77` — Simplify Action completion and assurance forms.
2. `f29d82a` — Add owner-to-manager Action lifecycle browser spec.
3. `e99ca2d` — Enforce Action assurance stages and Evidence eligibility; add disposable local gates and change record.
4. `9e556c6` — Record the initial Gate B/Gate C hold report.
5. `5c069ff` — Display the submitted completion account before verification, with browser regression assertion.
6. `e8dbf02` — Match the existing self-verification test to provider-policy wording without changing its intent.
7. `fffa530` — Wait for persisted verification/effectiveness content before screenshot capture.

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
| Browser regression | **BLOCKED at current HEAD** | The first sandbox attempt failed at Chromium launch (`spawn EPERM`). The unrestricted Chromium run then executed four selected tests: three passed, one failed on the old self-verification error-text expectation. The WP-004 lifecycle spec passed and saved three authenticated screenshots. The failing expectation and a screenshot-exposed detail-page defect were corrected in `e8dbf02`/`5c069ff`; Chromium must be rerun at this HEAD. Mobile did not run because the command stopped on the Chromium failure. |

The direct-request gate checked tenant concealment; location-restricted writes to branch and organisation-wide Actions; wrong-branch and archived Evidence rejection for completion and role links; missing completion account/Evidence; general create/edit bypasses; accepted canonical Completion Evidence without automatic verification or closure; explicit recurrence choice; owner self-verification denial; premature closure denial; and closed Action archive/restore denial. This is 27 checks total, including four fictional sign-ins.

The fresh migration script used a new temporary PostgreSQL schema within the named disposable test database and removed that schema afterward. The full independent PostgreSQL release-gate wrapper could not start a second cluster inside this sandbox (`pg_ctl` restricted-token error); its database-only option was discarded. The successful isolated-schema migration run is the WP-004 fresh-path evidence. The existing test DB is disposable and contains fictional fixtures only.

## Gate C — RM experience

**Burden evidence:** previous completion used three source-inspected visible inputs (note, percentage, Evidence); the new routine completion form uses two (account, Evidence), or one entry if eligible Completion Evidence is already linked. The successful Chromium lifecycle test actually performed three completion interactions: fill account, select Evidence, submit. Previous verification used eight source-inspected interactive controls, including two duplicate narratives; the new primary form has five interactive controls plus a read-only verifier. Previous effectiveness showed eleven controls; the new primary form shows six, with explicit outcome and recurrence choices. The baseline has not been measured in a rendered browser, so **no actual before/after reduction is claimed**.

**Rendered desktop review:** the unrestricted Chromium lifecycle test passed and persisted three non-zero screenshots from the first run, preserved in `outputs/WP-004_GATE_C/chromium-first-run/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-chromium/`:

- `wp004-completion-submitted.png` — 162,324 bytes.
- `wp004-verification-recorded.png` — 464,414 bytes.
- `wp004-effectiveness-reviewed.png` — 505,233 bytes.

The completion screenshot exposed a genuine display defect: the detail page said “Action completed: Not recorded” before verification despite a saved completion account. `5c069ff` now displays the latest 100% completion update in that summary and chronology, and the lifecycle test asserts it. The verification and effectiveness screenshots were captured before refreshed server content was visible; `fffa530` reloads and waits for the persisted decision/review before capture. Final screenshots at the corrected HEAD, mobile screenshots, and measured baseline burden remain pending. The separate failed Action gate trace is preserved at `outputs/WP-004_GATE_C/chromium-first-run/action-assurance-release-g-4c9a5-ness-and-closure-boundaries-chromium/trace.zip`.

## Specialist verdicts

| Specialist | Verdict |
| --- | --- |
| RM Advocate | PASS on stage separation in first-run desktop; corrected final capture pending. |
| UX Designer | HOLD on screenshot timing; no confirmed layout defect. |
| Form Simplicity Specialist | PASS on compact rendered primary forms; actual baseline measurement pending. |
| Plain Language Reviewer | PASS on source and first-run desktop wording. |
| Evidence Experience Specialist | PASS, source review of canonical Evidence and purpose-specific links. |
| Security/Tenancy Reviewer | PASS after correction; read-only code review plus lead's 27/27 direct gate. |
| Governance QA Consultant | PASS on code, release gate pending. |
| CQC-style Inspector review | PASS on evidence design with observation-period caution; no regulatory endorsement. |
| Accessibility/Mobile Reviewer | CONDITIONAL desktop PASS; corrected screenshots and mobile verdict pending. |
| Test Engineer | WP-004 lifecycle Chromium PASS; wider Chromium Action gate had one stale error-message expectation, now corrected; rerun pending. |
| Release Manager | **HOLD — NOT READY FOR PRODUCT OWNER REVIEW.** |

## Known follow-ups and decision

- Existing `atom-wordmark.png` aspect-ratio console warning is a separate non-blocking issue.
- Vinext reports an existing future native Vite-config compatibility warning, without failing the build.
- Native multi-select Evidence controls need live mobile usability review.
- The provider should ensure “sustained improvement” is backed by a meaningful observation period; the code does not impose a universal interval.

**Gate B: BLOCKED** until the current-HEAD Chromium rerun and mobile tests pass.  
**Gate C: BLOCKED** until corrected desktop/mobile screenshots and actual before/after burden measurements are recorded.  
**Final WP-004 verdict: BLOCKED — NOT READY FOR PRODUCT OWNER REVIEW.**  
No merge, remote push, deployment, production database or production data access occurred.

