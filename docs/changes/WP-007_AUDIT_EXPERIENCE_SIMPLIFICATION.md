# WP-007 — Audit Experience Simplification

**Status:** Final full browser regression in progress; local merge pending.
**Branch:** `wp-007-audit-experience` from local `main` `f369cd00dd62c07110743af088accb76cc2dfcf3` (after WP-006).
**Data boundary:** only fictional fixtures and the disposable `127.0.0.1:5432/care_governance_hub_test` database. No production access, remote push or deployment. No schema change or WP-007 migration.

## Product and governance result

The Audit Centre now presents **Current audit work** before score cards, the full table and template catalogue. Open Critical findings lead to the findings section. Audit detail presents **What needs attention**, objective and sampling context, then the editable form; score and supporting history remain available below. The read-only form retains an accurate navigation banner. Blank checks no longer display nine Evidence-source panels before the RM chooses an answer. On blocked submission, the form identifies the first missing answer, finding detail or Evidence source, shows a reason and focuses the relevant control. The full Audit form and all required server checks remain.

The existing canonical Audit, response, Finding, Evidence, Action and targeted re-audit records are reused. The pathway remains a human-controlled response and Finding, eligible Evidence, an explicit decision on whether a corrective Action is required, separate Action assurance when required, a targeted re-audit for High/Critical findings, an attributed Finding resolution, fieldwork sign-off and an authorised Audit assurance rationale. A score does not create assurance or claim a regulator rating. The RM must confirm the suggested sample; the UI no longer promises an unmeasured completion time.

WP-007 also closes security and integrity gaps found in specialist review. New response, Finding and re-audit Evidence links must reference active, non-archived Evidence authorised for the Audit location or organisation-wide. Detail and report hide legacy foreign-location Evidence titles. Finding resolution counts only currently eligible, non-retired links. A High/Critical Finding requires the **latest** targeted re-audit to be Resolved with eligible Evidence, both at Finding resolution and Audit closure. Closed and archived Audits reject Finding/Evidence/re-audit changes, and status transitions have explicit allowed source states. Resubmitting responses no longer silently changes a saved `actionRequired` decision.

## Failing-test-first and failure classification

- The new current-work browser assertion failed against the pre-change checkout before implementation, as expected. The audit assurance unit regression for latest re-audit ordering also failed before its correction.
- An early broad Chromium assurance run returned HTTP 404 during a re-audit POST. The trace showed Next.js `x-nextjs-action-not-found: 1` rather than the Audit route's 404 response. A fresh server run passed **2/2**. Classified **ENVIRONMENT / DEV-SERVER STATE ISSUE**; the route and governance rule were not weakened.
- A refreshed WP-007 browser run counted zero fieldsets before the newly navigated form rendered, then submitted a blank form and timed out waiting for a POST. The error snapshot showed all nine answers blank and a visible validation alert. Classified **TEST TIMING DEFECT**; the test now waits for the first fieldset. An unrelated mobile dashboard navigation timed out during that same failed run. Separate final Chromium and mobile experience runs passed **2/2** each.
- Existing full Audit assurance release tests passed on Chromium and mobile after the eligible historical re-audit check: **4/4**. The separate mobile form check passed **1/1**. No product change was made to satisfy a brittle locator.

## Measured RM burden

The same nine-question fictional Audit was measured in authenticated Chrome against the prior approved `main` checkout and WP-007. These are document positions and initially visible field counts, **not time saved**. Raw JSON and screenshots remain under `outputs/WP-007_BASELINE_DESKTOP_RETRY3`, `outputs/WP-007_BASELINE_MOBILE_RETRY` and `outputs/WP-007_FINAL_BROWSER` (paths relative to the parent workspace).

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| First current-work link from Audit Centre title, desktop 1280px | 619px | 216px | 403px earlier (65.1%) |
| First current-work link from title, mobile 390px | 1,118px | 420px | 698px earlier (62.4%) |
| Evidence-source controls visible before any answer | 9 | 0 | Nine fewer initially visible controls |
| Evidence Library pickers visible before any answer | 9 | 0 | Nine fewer initially visible pickers |
| Evidence-source controls visible after the first answer | 9 | 1 | One relevant control group shown |
| Required Audit answers | 9 | 9 | Governance input unchanged |

On the 390×664 mobile viewport the first current-work item begins at document Y=689, just below the initial viewport. The **Current audit work** heading and panel are visible without searching through scores or the template catalogue; bringing the first item fully above the fold is a separate refinement.

## Specialist verdicts

| Lens | Verdict and evidence |
| --- | --- |
| RM Advocate | PASS: current work and sampling context precede fieldwork; Critical task leads to findings. |
| Form Simplicity | PASS: nine initial Evidence-source panels/pickers become zero, with one appearing after the first answer; required answers remain. |
| Plain Language | PASS: the task and blocker wording is actionable. Technical “canonical” and “closed-loop” wording in supporting findings is a nonblocking refinement. |
| UX Designer | PASS: current work precedes analytics and history; the contradictory form banner was corrected. |
| Accessibility/Mobile Reviewer | PASS within rendered and browser-tested scope: stacked mobile layout, no observed horizontal overflow, keyboard focus to the missing control and `aria-invalid` marking. Screen-reader announcement of the inline reason remains unverified. |
| Governance QA / CQC-style review | PASS for scoped changes: no score-to-assurance shortcut; Action requirement is a deliberate recorded choice; eligible latest re-audit Evidence and separate decisions remain. |
| Security/Tenancy Reviewer | PASS static review after the legacy Evidence and re-audit eligibility corrections; no unresolved High/Critical new cross-location disclosure or mutation path identified. |
| Test Engineer | PASS on targeted desktop/mobile Audit and assurance browser gates and the static/unit gates. The complete repository E2E run is recorded below when finished. |
| Release Manager | Pending final full regression and evidence audit. |

## Gate B engineering evidence

| Check | Result |
| --- | --- |
| Unit/integration | PASS, **392/392** in 78 files at final code. |
| Prisma, TypeScript and ESLint | PASS through `npm.cmd run check`. |
| Disposable migrations | PASS: all 65 existing migrations applied to an isolated temporary schema, canonical table checks 5/5, schema dropped. Existing disposable schema `public` is up to date. No WP-007 migration. |
| Direct Action security/integrity regression | PASS, **27/27**. |
| Direct assurance/reopening regression | PASS, **18/18**. |
| 5,000-record Audit scoped fetch/current-work probe | PASS, fictional rows rolled back; **13.246, 9.878 and 9.192 ms**, each under 500 ms. This is a scoped query probe, not an end-to-end page load claim. |
| Next.js production build | PASS on final code; 149 static pages generated. |
| Sites/Vinext production build | PASS on final code; existing Vite native-config-loader and route-classification advisories remain. |
| Full repository E2E | In progress: 82 listed tests, Chromium and mobile, 1 worker. |

## Gate C browser and visual evidence

The final WP-007 experience tests passed **2/2 Chromium and 2/2 mobile**. The final Audit assurance release gate passed **4/4** across Chromium/mobile. The separate mobile fieldwork check passed **1/1**. Baseline burden and final burden measurements passed **2/2** each. The final screenshots below are authenticated, present and non-zero (paths relative to the parent workspace):

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Current work, viewport | `outputs/WP-007_EXPERIENCE_CHROMIUM_FINAL/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-chromium/wp007-audit-current-work-viewport-chromium.png` | `outputs/WP-007_EXPERIENCE_MOBILE_FINAL/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-mobile/wp007-audit-current-work-viewport-mobile.png` |
| Current work, full page | `outputs/WP-007_EXPERIENCE_CHROMIUM_FINAL/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-chromium/wp007-audit-current-work-chromium.png` | `outputs/WP-007_EXPERIENCE_MOBILE_FINAL/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-mobile/wp007-audit-current-work-mobile.png` |
| Finding and Evidence trail | `outputs/WP-007_EXPERIENCE_CHROMIUM_FINAL/wp007-audit-experience-Aud-2b098-and-rejects-another-service-chromium/wp007-audit-finding-chromium.png` | `outputs/WP-007_EXPERIENCE_MOBILE_FINAL/wp007-audit-experience-Aud-2b098-and-rejects-another-service-mobile/wp007-audit-finding-mobile.png` |
| Unanswered form burden | `outputs/WP-007_FINAL_BROWSER/wp007-audit-burden-measure-d4d23-out-a-time-saving-inference-chromium/wp007-measure-form-chromium.png` | `outputs/WP-007_FINAL_BROWSER/wp007-audit-burden-measure-d4d23-out-a-time-saving-inference-mobile/wp007-measure-form-mobile.png` |

The existing wordmark aspect-ratio warning persists. The mobile hydration attribute warning remains cause unconfirmed. Existing Audit policy still gives closure to the `GOVERNANCE_EDIT` capability rather than a separate provider-configured independence rule, and permits an explicit `actionRequired=false` even for High/Critical findings; WP-007 does not imply otherwise or silently change these professional decisions. These are separately tracked governance refinements, not newly introduced WP-007 behavior.

**Release verdict:** PENDING the full repository E2E result and clean source commit review. No remote push, Preview, deployment or production access occurred.
