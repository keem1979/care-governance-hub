# WP-007 — Audit Experience Simplification

**Status:** Gate B and Gate C passed; final Release Manager review and local merge pending.
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
- The first complete repository browser run finished **66 passed, 12 failed, 4 intentionally skipped**. The failures identified stale foundation and governed-status text assertions, a visual test still targeting the pre-WP-002 Evidence drawer, a `tsx` child startup error before visual fixture work, and one Windows `ERR_NETWORK_IO_SUSPENDED` during MFA sign-in. The corrected foundation/assurance cases passed **20/20**; the current visual flow passed **2/2** after switching that test fixture process to Node's native TypeScript support and adding cleanup after failures. The interrupted mobile Incident case passed in both focused and final full runs. Product security or assurance controls were not loosened.
- A later full run exposed two test helpers creating a default Basingstoke Audit while selecting Guildford-scoped Evidence. The absence of that Evidence option was the correct WP-007 location control. The existing Audit assurance helper passed **4/4** and the WP-007 experience helper passed **4/4** after both explicitly selected the fixture's Guildford service. The Oxford cross-location negative assertions remain. These were **TEST FIXTURE / SCOPE DEFECTS**, not product defects.
- The final complete Chromium/mobile repository browser run at `cddd8e7c66d7181b86eddac3dbe66cf9066ec6c1` passed **78**, intentionally skipped **4**, failed **0** across **82** listed cases. The four skips are two mobile-only Risk checks skipped in the desktop project and two server-boundary Quick Find checks skipped in the mobile project because their server paths run on desktop. Artifacts are under `outputs/WP-007_CONVERGENCE_FINAL`.
- A subsequent direct request regression exposed **TEST-STATE / ISOLATION ISSUE** in the guarded fictional setup route. The visual fixture temporarily moved `E2E-SRC-001` to Guildford and restored its reference but not its location; repeated setup also failed to reset that field. An organisation-wide Action correctly rejected the remaining Guildford Evidence. Security/Tenancy review approved a test-only reset to `locationId: null` for that one fixture and restoration of the visual fixture's location. The setup endpoint's production flag and token guard, and every Action eligibility check, remain unchanged. The direct gate then passed **27/27**, assurance/reopening passed **18/18**, visual desktop/mobile passed **2/2**, and affected Audit desktop/mobile journeys passed **8/8**. The complete 82-case run preceded only these test-fixture corrections; the affected paths were rerun at the corrected source state, while unrelated full-suite evidence remains valid.

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
| Security/Tenancy Reviewer | PASS static review after the legacy Evidence and re-audit eligibility corrections; PASS on the guarded fictional-fixture reset, with no route guard or product authorization weakening. No unresolved High/Critical new cross-location disclosure or mutation path identified. |
| Test Engineer | PASS: final full browser run 78 passed, 4 intentional skips, 0 failed; all fixture and stale assertion failures classified and corrected at the test layer. |
| Release Manager | Pending final evidence audit and clean source review. |

## Gate B engineering evidence

| Check | Result |
| --- | --- |
| Unit/integration | PASS, **392/392** in 78 files at final code. |
| Prisma, TypeScript and ESLint | PASS through `npm.cmd run check`. |
| Disposable migrations | PASS: all 65 existing migrations applied to an isolated temporary schema, canonical table checks 5/5, schema dropped. Existing disposable schema `public` is up to date. No WP-007 migration. |
| Direct Action security/integrity regression | PASS, **27/27** after the deterministic fictional-fixture reset. |
| Direct assurance/reopening regression | PASS, **18/18** after the deterministic fictional-fixture reset. |
| 5,000-record Audit scoped fetch/current-work probe | PASS, fictional rows rolled back; **13.246, 9.878 and 9.192 ms**, each under 500 ms. This is a scoped query probe, not an end-to-end page load claim. |
| Next.js production build | PASS after the guarded test-fixture reset; 149 static pages generated. |
| Sites/Vinext production build | PASS after the guarded test-fixture reset; existing Vite native-config-loader and route-classification advisories remain. |
| Full repository E2E | PASS at `cddd8e7c66d7181b86eddac3dbe66cf9066ec6c1`: **78 passed, 4 intentional skips, 0 failed** of 82 listed Chromium/mobile cases, 1 worker, 29.7 minutes. Subsequent test-fixture-only changes passed affected browser retests **2/2 visual** and **8/8 Audit**. |

## Gate C browser and visual evidence

The final WP-007 experience tests passed **2/2 Chromium and 2/2 mobile** in the complete run. The final Audit assurance release gate passed **4/4** across Chromium/mobile. The separate mobile fieldwork check passed **1/1**. Baseline burden and final burden measurements passed **2/2** each. The final screenshots below are authenticated, present and non-zero (paths relative to the parent workspace):

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Current work, viewport | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-chromium/wp007-audit-current-work-viewport-chromium.png` | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-mobile/wp007-audit-current-work-viewport-mobile.png` |
| Current work, full page | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-chromium/wp007-audit-current-work-chromium.png` | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-unf-bf95c-fore-score-and-form-history-mobile/wp007-audit-current-work-mobile.png` |
| Finding and Evidence trail | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-Aud-2b098-and-rejects-another-service-chromium/wp007-audit-finding-chromium.png` | `outputs/WP-007_CONVERGENCE_FINAL/test-results/wp007-audit-experience-Aud-2b098-and-rejects-another-service-mobile/wp007-audit-finding-mobile.png` |
| Unanswered form burden | `outputs/WP-007_FINAL_BROWSER/wp007-audit-burden-measure-d4d23-out-a-time-saving-inference-chromium/wp007-measure-form-chromium.png` | `outputs/WP-007_FINAL_BROWSER/wp007-audit-burden-measure-d4d23-out-a-time-saving-inference-mobile/wp007-measure-form-mobile.png` |

The existing wordmark aspect-ratio warning persists. The mobile hydration attribute warning remains cause unconfirmed. Existing Audit policy still gives closure to the `GOVERNANCE_EDIT` capability rather than a separate provider-configured independence rule, and permits an explicit `actionRequired=false` even for High/Critical findings; WP-007 does not imply otherwise or silently change these professional decisions. These are separately tracked governance refinements, not newly introduced WP-007 behavior.

The wider authenticated visual pass saved **29 non-zero desktop/mobile screenshots** under `outputs/WP-007_CONVERGENCE_FINAL/visual-screenshots`, including `09-evidence-drawer-desktop.png` and `m08-evidence-drawer-mobile.png` showing the current contextual Evidence preview. The full suite checks page load, network idle, overlay absence and horizontal overflow during that capture.

**Release verdict:** PENDING final Release Manager review and clean source commit. No remote push, Preview, deployment or production access occurred.
