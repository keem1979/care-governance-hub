# WP-006 — Risk Experience Simplification

**Status:** Gate B and Gate C passed; locally merged.
**Branch:** `wp-006-risk-experience`.
**Approved base:** local `main` at `2e715af5cbd70183a43a5135d2dcd1146f1e100f` (WP-005 merge).
**Source SHA:** `898c158b913bbc61ee5aa104d4112a00507848ef`.
**Local non-fast-forward merge SHA:** `c5e527dd73292b2f5afadf9201e928526cc86978` (approved base first parent, exact source second parent).
**Data boundary:** only the disposable `127.0.0.1:5432/care_governance_hub_test` database and fictional E2E fixtures. No production access, remote push, or deployment. No schema change or new migration.

## Purpose and architecture

The Risk Register previously placed actionable Risks after a guide, portfolio totals, and a heat map. The formal review sat below extensive record detail. New Risk ratings and formal-review conclusions contained preselected professional judgements. WP-006 keeps the canonical `Risk`, `RiskReview`, `RiskEvidence`, Action and Evidence lifecycles. It changes the work order and makes the human choices explicit. The mandatory scored Risk schema remains intact, so this package does not invent an unassessed draft Risk or equate the register's `UNASSESSED` state with LOW.

- A scoped **Current work / Needs attention** list precedes analytics and links to canonical Risks. The list shows recorded Critical/High, tolerance, framework, due-date, owner and control-testing conditions. These are prompts to review, not a computed governance score or closure decision.
- Risk detail exposes **Record formal review** near the top and shows recorded assurance gaps and framework changes. Historical tolerance remains in the record; the current framework is named separately and an above-current-tolerance position is not shown as a green MONITOR state.
- Six new-Risk likelihood/impact choices and four formal-review decisions start blank. Score previews say **Not assessed yet** until selected. A new Risk with no applicable approved framework also requires explicit appetite, tolerance and treatment choices; an approved framework still supplies its governed appetite and tolerance. A changed framework requires an explicit keep/apply/override decision at formal review. The review API rejects forged submissions missing those decisions. Existing scored Risks retain their saved edit values.
- The global floating Abi control is suppressed on Risk routes because it covered current-work links and mobile form content. Other app routes retain their existing behavior.
- A Risk-sourced MEDIUM Action now translates that Action priority to the `MODERATE` Risk-policy enum before policy lookup. The two enum vocabularies remain distinct; this fixes an assurance page crash discovered by the lifecycle regression.

The permission and tenancy model remains server-side: Risk reads use `GOVERNANCE_VIEW` with `riskScopeWhere(context)`; review writes retain `GOVERNANCE_EDIT`, tenant and location checks; closure retains its independent policy authority and historical decisions. The guarded test-only setup endpoint remains token-protected and confined to fictional data. Its Action-assurance fixtures now use a dedicated fictional source Risk, leaving the closure-ready Risk free of unrelated unresolved Actions.

## Failing-test-first and failure classification

- Baseline WP-006 Chromium browser assertions failed **3/3**: preselected ratings, absent current-work heading and absent early formal-review link. The first corrected focused run passed **3/3**; Chromium/mobile targeted run passed **6/6**.
- Existing closure security test initially failed a “ready” proposal with HTTP 409 because test setup had linked three unresolved Action-assurance fixtures to that same Risk. Classified **TEST-STATE / ISOLATION ISSUE**. The separate fictional Risk fixture corrected it; isolated Chromium closure security passed **1/1**. Endpoint guards and closure rules were not relaxed.
- Existing Risk lifecycle test first used obsolete Action labels/flows from earlier packages. Classified **TEST DEFECT**; assertions were updated to exercise the current separate owner completion, manager verification, effectiveness, Action closure and Risk review. This exposed a **PRODUCT DEFECT**: Risk-policy lookup passed Action priority `MEDIUM` where Prisma requires Risk level `MODERATE`. The explicit mapping and unit regression fixed it. A later broad “Observed result” locator was corrected to the exact textbox name. Isolated lifecycle Chromium then passed **1/1**.
- Initial visual review found Abi overlapping the first mobile current-work link and a historical green tolerance message that failed to surface a newer framework exception. Classified **PRODUCT UX DEFECTS** within WP-006; the Risk-route assistant suppression and explicit framework wording/current-work item corrected them. Final targeted Chromium/mobile browser checks passed **6/6** with fresh screenshots.

## Measured RM burden

The same fictional fixture was measured through authenticated Chrome against the approved baseline checkout and the WP-006 checkout. Measurements are document positions, not time saved. Raw values and screenshots are preserved under `outputs/WP-006_BASELINE_MEASURE` and `outputs/WP-006_AFTER_MEASURE_FINAL`.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| First actionable Risk link from register title, desktop 1280px | 1,194px | 303px | 891px earlier (74.6%) |
| First actionable Risk link from register title, mobile 390px | 2,286px | 417px | 1,869px earlier (81.8%) |
| Preselected professional ratings on new Risk | 6/6 | 0/6 | Six deliberate selections rather than six silent judgements |
| Preselected formal-review decisions | 4/4 | 0/4 | Four deliberate selections rather than four silent judgements |
| Direct review link near top | Absent | 610px desktop; 846px mobile document Y | One visible jump to the existing form |

The formal-review heading itself moved from 3,643px to 3,973px below the desktop detail title and from 6,381px to 6,635px below the mobile title because the current-work content adds height. The measured benefit is the early action/link and explicit decisions; no shorter page or time saving is claimed. The work does not remove required professional input from the canonical Risk model.

## Specialist review

| Specialist | Verdict and basis |
| --- | --- |
| RM Advocate | PASS on final desktop/mobile screenshots: current work precedes analytics and framework exceptions link to the canonical Risk. |
| Form Simplicity | PASS: new ratings, no-framework strategy and formal-review decisions require deliberate input; no silent professional conclusion. |
| Plain Language | PASS: historical and current tolerance are distinguished and the current above-tolerance position says ESCALATE / REVIEW. |
| UX Designer | PASS: current-work hierarchy and original assessment sections remain clear on desktop/mobile. |
| Accessibility/Mobile Reviewer | PASS for final rendered visual scope: primary links and controls are readable and unobstructed; Abi no longer covers the mobile Risk UI. Full register table still scrolls horizontally, while immediate current-work links remain visible. |
| Governance QA / CQC-style review | PASS after correcting the no-framework appetite/tolerance/treatment defaults and changed-framework review default. Deliberate judgement, policy history, Action/Risk closure separation and Evidence gaps remain explicit. |
| Security/Tenancy Reviewer | PASS code review: no new High/Critical security or tenant issue; scoped reads and guarded writes remain; test fixture isolation retains endpoint guard. |
| Test Engineer | PASS: final integrated desktop/mobile gate 20 passed, 2 intentionally skipped; tests include new assessment, Risk review, lifecycle and closure, security, assurance and measured burden. |
| Release Manager | PASS: Gate B and Gate C complete, no unresolved blocker; authorised local merge permitted under the programme's schema-neutral green-gate rule. |

## Gate B engineering evidence

| Check | Result |
| --- | --- |
| Unit/integration suite | PASS, 388/388 tests in 78 files. |
| TypeScript and ESLint | PASS, `npm.cmd run typecheck` and `npm.cmd run lint`. |
| Prisma | PASS, validation and migrate status; disposable test DB has 65 existing migrations and is up to date. No WP-006 migration. |
| Fresh migrations | PASS, all 65 existing migrations applied to an isolated temporary schema; five canonical-table checks passed; temporary schema dropped. |
| Next.js production build | PASS, Next 16.2.11 compiled and generated 149 static pages. |
| Sites/Vinext production build | PASS, with existing non-blocking Vite config loader and route classification advisories. |
| Direct security/integrity | PASS, 27/27 direct checks. |
| Direct assurance/reopen | PASS, 18/18 direct checks. |
| 5,000-record Risk performance | PASS, fictional rows in a rolled-back transaction; scoped probes 16.204ms, 11.571ms and 14.041ms, all under the 500ms gate. |

## Gate C browser and visual evidence

The final integrated Chromium/mobile run passed **20 tests**, with **2 intentionally skipped**, across the WP-006 experience and burden specs plus Risk lifecycle, closure security, Risk mobile and Action assurance release-gate specs. Evidence is preserved under `outputs/WP-006_FULL_BROWSER_FINAL`. A separate narrowed governance run passed **8/8** under `outputs/WP-006_GOVERNANCE_BROWSER`. The authenticated baseline and final burden runs each passed **2/2**.

Final non-zero screenshots (paths relative to the repository's parent workspace):

| Surface | Desktop | Mobile |
| --- | --- | --- |
| New Risk, blank professional choices | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-a-ne-71485-berate-professional-ratings-chromium/wp006-new-risk-chromium.png` | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-a-ne-71485-berate-professional-ratings-mobile/wp006-new-risk-mobile.png` |
| Risk register, current work before analytics | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-the--40f70--attention-before-analytics-chromium/wp006-risk-register-chromium.png` | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-the--40f70--attention-before-analytics-mobile/wp006-risk-register-mobile.png` |
| Formal review and framework decision | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-an-o-f4b65-deliberate-review-decisions-chromium/wp006-formal-review-chromium.png` | `outputs/WP-006_FULL_BROWSER_FINAL/wp006-risk-experience-an-o-f4b65-deliberate-review-decisions-mobile/wp006-formal-review-mobile.png` |

All six files were verified present and non-zero. The wordmark aspect-ratio warning and mobile hydration attribute warning (cause unconfirmed) remain separate, non-blocking follow-ups in `docs/NON_BLOCKING_UI_FOLLOWUPS.md`. The existing framework-change statistic label is narrower than the detail page's broader changed-framework warning; it is a non-blocking wording follow-up. No production database, push or deployment was used.

**Release verdict:** PASS — READY FOR PRODUCT OWNER REVIEW. The continuous programme's schema-neutral green-gate rule authorised this local non-fast-forward merge. No remote push or deployment occurred.
