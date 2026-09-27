# WP-004 — final Gate B and Gate C evidence

**Branch:** `wp-004-action-assurance-simplification`
**Validated implementation and test HEAD:** `b865eaf8c0d5936b9ba575ea76c053786104957d`
**Base:** approved local WP-003 merge `4080eeac880ce3f4f05841dee6caaf5a8cf1da3e`
**Final verdict:** **READY FOR PRODUCT OWNER REVIEW — NOT DEPLOYED**. No merge, remote push, deployment, production database or production data access occurred.

## Delivered and governed boundaries

The Action detail page presents the owner's current work as **What did you do? + Completion Evidence → Submit for verification**. Routine progress is separate. Verification displays the saved completion account and linked Evidence, then asks an authorised manager for an explicit outcome, Evidence checked, result against the success measure and rationale. Effectiveness asks for an explicit outcome, observed result, Evidence, recurrence choice and management decision. Baseline and target details are available under disclosure. A recurrence requires immediate-control and escalation accounts. Closure remains a later, independently authorised decision.

The canonical Action, Evidence, ActionEvidence, Verification, EffectivenessReview and ActivityLog records remain in use. The server enforces tenant, location, permission, active Evidence, closed/archived-record and role-separation rules. High/Critical verification and closure cannot be performed by an ineligible owner/verifier. Completion, verification, effectiveness and closure are distinct, attributable states. **WP-004 adds no schema migration.** WP-002 Evidence and WP-003 initial capture remain available.

Implementation commits since the approved base, in order: `eb41b77`, `f29d82a`, `e99ca2d`, `9e556c6`, `5c069ff`, `e8dbf02`, `fffa530`, `2718ea5`, `c58e32a`, `e84b896`, `ac2aca4`, `d89fc69`, `b865eaf`. The later commits correct browser assertions and fixture isolation; no duplicate-action safeguard was weakened.

Tracked files changed in the package:

- `src/app/(app)/actions/[id]/page.tsx`; `src/app/(app)/actions/[id]/assurance/page.tsx`
- `src/components/action-controls.tsx`; `src/components/action-form.tsx`; `src/components/assurance-workflow-controls.tsx`
- `src/lib/actions.ts`; `src/lib/actions.test.ts`
- `src/app/api/actions/route.ts`; `src/app/api/actions/[id]/route.ts`; `src/app/api/actions/[id]/updates/route.ts`; `src/app/api/actions/[id]/evidence-links/route.ts`
- `src/app/api/actions/[id]/assurance/{closure,dependencies,effectiveness,root-cause,verification}/route.ts`; `src/app/api/actions/[id]/assurance/dependencies/[dependencyId]/route.ts`
- `src/app/api/evidence/contextual/route.ts`; `src/app/api/test/e2e/setup/route.ts`
- `tests/e2e/{action-assurance-mobile,action-assurance-release-gate,wp004-action-lifecycle}.spec.ts`
- `scripts/{wp004-direct-request-gate.ts,wp004-disposable-migration-gate.mjs,wp004-evidence-performance-gate.mjs}`
- `docs/changes/{WP-004_ACTION_ASSURANCE_SIMPLIFICATION,WP-004_FINAL_GATE_B_GATE_C}.md`

The exact list is reproducible with `git diff --name-only 4080eeac880ce3f4f05841dee6caaf5a8cf1da3e HEAD`. No generated test or build output is tracked.

## Gate B — engineering assurance: PASS

| Check | Exact result |
| --- | --- |
| Unit/integration | **385/385 passed**, 77 files, at validated implementation/test HEAD |
| TypeScript, ESLint, Prisma validation | **PASS** each |
| Fresh migration path | **65/65 migrations passed** in a temporary schema within the named disposable local PostgreSQL test database; temporary schema removed |
| Existing disposable database | Migration status current; **no WP-004 migration** |
| Next.js production build | **PASS** |
| Sites/Vinext production build | **PASS** |
| Authenticated direct-request security/integrity | **27/27 passed** against fictional records in disposable `127.0.0.1:5432/care_governance_hub_test` |
| Evidence search scale | **5,000 fictional rows**; search **4.417 ms**, paged listing **8.417 ms**; probe transaction rolled back |
| Chromium targeted browser suite | **4/4 passed**, 2.0 minutes, at `b865eaf`; persisted `outputs/WP-004_GATE_C/chromium-post-b865eaf/.last-run.json` reports passed and no failed tests |
| Mobile targeted browser suite | **2/2 passed**, 47.4 seconds, at `b865eaf`; persisted `outputs/WP-004_GATE_C/mobile-post-b865eaf/.last-run.json` reports passed and no failed tests |

The direct-request gate covered tenant concealment; authorised versus wrong-location Action writes; wrong-branch, archived and unlinked Evidence; missing completion account/Evidence; general create/edit bypasses; canonical completion Evidence without automatic assurance; explicit recurrence choice; owner self-verification denial; premature closure denial; and closed Action archive/restore denial. No Critical/High security or isolation issue remains open.

Earlier browser failures were classified and resolved as test assertion/layout drift or disposable fixture isolation. The server correctly rejected self-verification, and the test now expects the provider-policy wording. Evidence-link tests now use the existing **Add Evidence → Use existing → Search → Preview** control. The WP-004 lifecycle fixture receives a unique fictional reference and authorised fictional Client; test-only cleanup removes previous WP-004 Actions. A genuine duplicate suggestion still fails the test; it is not silently rejected. The readiness test now waits for a separate closer. These changes did not weaken product controls.

**Artifact provenance:** A fresh unrestricted run restored both current-HEAD output directories after an earlier sandbox retry had overwritten the first Chromium artifacts. The new terminal log, both `.last-run.json` markers and all six current-HEAD screenshots agree on PASS. The mobile log contains a React hydration attribute warning with `caret-color: transparent` on form fields, an attribute absent from the application source. This did not fail either mobile test; the exact injector was not established and is recorded as a non-blocking environment/visual follow-up.

## Gate C — RM experience: PASS with measured limits

The approved pre-WP-004 UI at `4080eea` was opened in a separate local checkout against the disposable fictional environment. Rendered accessibility snapshots showed the visible primary-form control counts below. The new counts were checked against the implemented rendered workflow and passing authenticated lifecycle test.

| Stage | Previous visible controls | New primary controls | Measured change |
| --- | ---: | ---: | --- |
| Completion | 3: update note, progress percentage, Evidence | 2: completion account, Evidence | 1 fewer visible control (33%) |
| Verification | 7: outcome, date, Evidence, completed-work narrative, Evidence summary, success-measure result, rationale | 5: outcome, date, Evidence, result, rationale | 2 fewer visible controls (29%) |
| Effectiveness | 11: outcome, date, baseline, target, observed result, Evidence, recurrence, decision, next-review date, immediate control, escalation | 6 primary: outcome, date, observed result, Evidence, recurrence, decision | 5 fewer primary controls (45%); additional details remain available when needed |

An actual old-UI fictional completion used **four direct UI actions**: enter the work account, set progress to 100%, choose canonical Evidence and submit. The rendered page then showed **Manager verification required**. The passing new Chromium lifecycle used **three direct UI actions**: enter the account, choose Evidence and submit. This is **one fewer action (25%)** for that completion scenario. The old verification/effectiveness forms were rendered and counted, but an old verification attempt did not persist because shared disposable E2E fixtures were reset during the comparison. Therefore this report claims **no completed legacy verification/effectiveness comparison, click reduction or time saving** for those stages. New explicit outcome/recurrence choices can increase minimum steps while making the human judgement deliberate.

The new browser lifecycle confirmed that completion saved one canonical Completion Evidence relationship and left verification/closure outstanding; verification saved a separate manager decision; effectiveness saved a separate observed result and did not automatically close the Action. The mobile test checked for horizontal overflow. The rendered desktop and mobile review found the current-work action discoverable and the three stages distinct. Accessibility/Mobile review is a focused review, not a complete WCAG audit.

### Authenticated screenshots

Each file exists and has non-zero size. Desktop and mobile captures are from the final validated implementation/test HEAD.

| View | Completion | Verification | Effectiveness |
| --- | --- | --- | --- |
| Desktop | `../../outputs/WP-004_GATE_C/chromium-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-chromium/wp004-completion-submitted.png` (168,030 B) | `../../outputs/WP-004_GATE_C/chromium-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-chromium/wp004-verification-recorded.png` (487,711 B) | `../../outputs/WP-004_GATE_C/chromium-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-chromium/wp004-effectiveness-reviewed.png` (491,771 B) |
| Mobile | `../../outputs/WP-004_GATE_C/mobile-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-mobile/wp004-completion-submitted.png` (658,756 B) | `../../outputs/WP-004_GATE_C/mobile-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-mobile/wp004-verification-recorded.png` (2,324,321 B) | `../../outputs/WP-004_GATE_C/mobile-post-b865eaf/wp004-action-lifecycle-an--ed7f5-nce-decisions-stay-separate-mobile/wp004-effectiveness-reviewed.png` (2,368,610 B) |

## Specialist verdicts

| Specialist | Verdict |
| --- | --- |
| RM Advocate | **PASS** — owner completion is in current work; later judgements remain separate |
| UX Designer | **PASS** — rendered hierarchy and distinct decisions reviewed |
| Form Simplicity Specialist | **PASS** — comparable rendered field counts and executed completion burden recorded |
| Plain Language Reviewer | **PASS** — no wording treats Evidence upload as proof of sufficiency or closure |
| Evidence Experience Specialist | **PASS** — canonical Evidence reused with role-specific relationships |
| Governance QA Consultant | **PASS** — accountable decisions and history preserved |
| CQC-style Inspector review | **PASS for product review** — Evidence and observation-period caution recorded; no regulatory endorsement claimed |
| Accessibility/Mobile Reviewer | **PASS for focused desktop/mobile scope** — rendered layout and no-overflow assertions; full WCAG audit not claimed |
| Security/Tenancy Reviewer | **PASS** — code review and 27/27 direct-request gate; no Critical/High blocker |
| Test Engineer | **PASS** — 4/4 Chromium and 2/2 mobile targeted suite |
| Release Manager | **READY FOR PRODUCT OWNER REVIEW — NOT DEPLOYED**, with the artifact provenance and burden limits above |

## Known non-blocking follow-ups

- Existing `atom-wordmark.png` aspect-ratio console warning; track separately.
- Mobile run hydration attribute warning involving `caret-color: transparent`; no matching application source was found, tests passed, and the specific browser-side injector is unconfirmed.
- Existing Vinext future native Vite-config compatibility warning; Sites build passed.
- Native mobile Evidence multi-select warrants later usability review.
- Any claim of “sustained improvement” must use a meaningful observation period under provider policy; no universal interval was invented.

**Gate B: PASS. Gate C: PASS for the reviewed scope. Final WP-004 verdict: READY FOR PRODUCT OWNER REVIEW — NOT DEPLOYED.**
