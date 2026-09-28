# QCGMS WP-006–WP-010 convergence evidence

**Scope:** local development convergence after the five reviewed work packages. The separate release candidate remains frozen at the approved WP-005 boundary. No remote push, Preview, deployment, production database access or production migration occurred.

## Reviewed local history

Local `main` began this sequence at WP-005 boundary `2e715af5cbd70183a43a5135d2dcd1146f1e100f`. Each work package has a non-fast-forward local merge and an individual report:

| Package | Reviewed source | Local merge | Report |
| --- | --- | --- | --- |
| WP-006 Risk | `898c158b913bbc61ee5aa104d4112a00507848ef` | `c5e527dd73292b2f5afadf9201e928526cc86978` | [WP-006](WP-006_RISK_EXPERIENCE_SIMPLIFICATION.md) |
| WP-007 Audit | `8365bd371a7a8e4c04c64ed7afcb113bbdd0aad9` | `9d97ebce381fed04e583b1c8bd97de868802bc8f` | [WP-007](WP-007_AUDIT_EXPERIENCE_SIMPLIFICATION.md) |
| WP-008 Meeting | `20718fa42eb68cb88c9dd97b9321507652b94171` | `58f08e9e4622623d22feb370e84013d71f6e92be` | [WP-008](WP-008_GOVERNANCE_MEETING_REVIEW_EXPERIENCE.md) |
| WP-009 Policy/Control | `468cabcf9dd2fd67d6445bbd0d8af11464177b67` | `5545fb2764c5924e3a66573e9444fa7a379160dc` | [WP-009](WP-009_POLICY_CONTROL_ASSURANCE_EXPERIENCE.md) |
| WP-010 Inspection/commissioner | `ae5478b05a4d8828645005beffd2ebf70c6d9c5a` | `95bf58b10267805db0a2a27446f762d562d00054` | [WP-010](WP-010_INSPECTION_COMMISSIONER_READINESS.md) |

Two subsequent **test-only** convergence commits make the Windows browser gate tolerate an explicitly observed loopback suspension: `3171f90167d7b26e497e6668bb63eb8d882ec95e` uses the existing safe navigation helper in the Action mobile test; `36e7b54c3a980cfb339f341728ab1edb6aedd98e` retries a navigation or sign-in only when Playwright reports `ERR_NETWORK_IO_SUSPENDED`. The retry does not accept an HTTP error, bypass a product assertion or alter application code.

## Gate B: merged-main engineering assurance

| Check | Actual result | Evidence |
| --- | --- | --- |
| Prisma validation, TypeScript, ESLint, complete unit/integration | **PASS:** 81 files, **444/444** tests, 0 failed after final test-harness edit | `outputs/CONVERGENCE_GATE_B/npm-check-final.log` |
| Disposable database migration state | **PASS:** 65/65 applied, 0 unresolved on `127.0.0.1:5432/care_governance_hub_test` | Local guarded migration query; no credentials printed |
| Fresh migration path | **PASS:** all 65 migrations applied to an isolated temporary schema; fresh Risk default remains `UNASSESSED`; schema dropped | `outputs/CONVERGENCE_GATE_B/fresh-migration.log` |
| Schema delta WP-006–WP-010 | **None** (`git diff` from WP-005 boundary under `prisma/migrations` empty) | Git verification |
| Direct Action security/integrity | **PASS 27/27**: location, tenant, Evidence role, completion and closed-record negatives | `outputs/CONVERGENCE_GATE_B/wp004-direct-request.log` |
| Assurance/reopening | **PASS 18/18**: role/tenant boundaries, reasoned reopening, renewed work and append-only events | `outputs/CONVERGENCE_GATE_B/wp005-assurance.log` |
| WP-010 focused security | **PASS 8/8**: scoped linked children, claims and immutable completed samples | [WP-010 report](WP-010_INSPECTION_COMMISSIONER_READINESS.md) |
| Next.js production build | **PASS** on merged product code | `outputs/CONVERGENCE_GATE_B/next-build.log` |
| Sites/Vinext build | **PASS** on merged product code; existing classification advisory remains | `outputs/CONVERGENCE_GATE_B/vinext-build.log` |
| 5,000-record probes | **PASS:** WP-006 Risk 16.204/11.571/14.041 ms; WP-007 Audit 13.246/9.878/9.192 ms; WP-010 Inspection 16.460/11.240/13.688 ms. Fictional rows rolled back. These are scoped fetch/map probes, not end-to-end page latency. | Individual WP reports and `outputs/WP-010_GATE_B/wp010-inspection-performance.txt` |

The direct and browser gates used only the named disposable local database and fictional fixtures. No package after WP-005 introduced a migration. The applicable existing upgrade migration evidence is retained in the earlier WP-003/004/005 reports; this sequence required no additional upgrade migration.

## Gate C: cross-module desktop and mobile

The final validated browser coverage is **92 passed, 4 intentional skips, 0 failed** across 96 listed cases: Chromium **46 passed / 2 skipped** from `outputs/CONVERGENCE_GATE_C/full-e2e.log` and mobile **46 passed / 2 skipped** from `outputs/CONVERGENCE_GATE_C/mobile-final-v2.log`. The final mobile invocation used one available Playwright retry; **0 cases needed it**. The four skips are two mobile-only Risk cases on Chromium and two duplicate server-scope profile cases on mobile. Both projects exercised authenticated Action, Evidence, capture, Audit, Incident, Complaint, Safeguarding, Risk, Meeting, Policy/Control and Inspection journeys.

The first full invocation was **90 passed, 4 skipped, 2 failed**. Its two failures were Windows browser transport interruptions: an Action mobile direct navigation received `ERR_NETWORK_IO_SUSPENDED`; a Complaint Calendar navigation had a 200 document but subsequent resources received the same browser error and `domcontentloaded` timed out. Both affected mobile cases passed a separate **2/2** rerun. A subsequent full mobile invocation was **45 passed, 2 skipped, 1 failed** when a sign-in request failed with `ERR_NETWORK_IO_SUSPENDED` and no HTTP response. The shared test helper was then scoped to retry only that observed transport condition. The complete final mobile project passed **46/46 runnable cases**, without a retry. Earlier failed logs and traces remain in their original output directories; they have not been overwritten or misreported as passing.

Authenticated final screenshot sets contain **29 nonzero desktop** PNGs under `outputs/CONVERGENCE_GATE_C/full-e2e` and **29 nonzero mobile** PNGs under `outputs/CONVERGENCE_GATE_C/mobile-final-v2`. The final WP-010 review set additionally contains eight nonzero inspection and pack images under `outputs/WP-010_GATE_C/final-v5`. Representative files:

| View | Desktop | Mobile |
| --- | --- | --- |
| Inspection first viewport | `outputs/CONVERGENCE_GATE_C/full-e2e/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-inspection-first-viewport.png` | `outputs/CONVERGENCE_GATE_C/mobile-final-v2/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-inspection-first-viewport.png` |
| Compiled pack first viewport | `outputs/CONVERGENCE_GATE_C/full-e2e/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-pack-first-viewport.png` | `outputs/CONVERGENCE_GATE_C/mobile-final-v2/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-pack-first-viewport.png` |

The installed `agent-browser` executable was unavailable locally. The WP-010 authenticated Playwright checks covered network idle, error overlay and page errors, interactive accessibility snapshot, desktop/mobile rendering, screenshots and no horizontal overflow; the browser processes closed after the run. The full cross-module run exercised the working flows and negative security paths. An independent screen-reader audit is not claimed.

## Measured RM burden and governance

Measurements are real positions, visible controls and navigation counts from the individual baseline/final reports; no time saving is inferred:

| Work package | Before → after |
| --- | --- |
| WP-006 Risk | First actionable link 1,194→303 px desktop and 2,286→417 px mobile from title; six preselected new-Risk professional ratings and four preselected review conclusions became zero preselected choices. |
| WP-007 Audit | First current-work link 619→216 px desktop and 1,118→420 px mobile; nine initially visible Evidence-source controls became zero while all nine required answers remain. |
| WP-008 Meeting | Direct Minutes link 0→1; three initially expanded supporting groups→zero; two client-entered approval actor/date controls→server-attributed actor/date. |
| WP-009 Policy/Control | Nine detail metadata rows and seven retired Control cards initially visible→zero, retained in named disclosures; four generic edit status choices→two, with separate approval/archive actions. |
| WP-010 Inspection | First gap and overdue review each required a tab click→zero view changes; 66 default requirement cards→eight current-work previews with all 66 retained in disclosure; pack still needs zero typed fields. |

Specialist verdicts across the reviewed packages: RM Advocate, Form Simplicity, Plain Language, UX, Governance QA/CQC-style review, Security/Tenancy, Accessibility/Mobile and Test Engineer **PASS for their recorded scope**. WP-010's scoped compilation received explicit governance, security, mobile and test passes after corrections. The Release Manager's **development convergence verdict is READY FOR PRODUCT OWNER REVIEW**: no unresolved High/Critical application or tenant-isolation issue was found in the completed gates. Completion, verification, effectiveness and closure remain distinct human decisions; Risk `UNASSESSED` is never LOW; canonical Action/Evidence, append-only assurance history and server-side tenant/location/permission checks remain intact. No invented regulator compliance or assurance score was introduced.

Known non-blocking follow-ups: existing `atom-wordmark.png` aspect-ratio warning; mobile hydration attribute warning (**cause unconfirmed**); Vinext native-config-loader/route-classification advisories; some scrolling before the first WP-010 mobile current-work row; the WP-009 authorised Evidence picker can show another authorised branch before the server rejects it for the selected record. Historical cross-location links were not retrospectively audited. The latest Windows loopback transport interruption is a test-environment follow-up; the final desktop/mobile gate passed.

## Separate frozen release track

The isolated local branch `release/qcgms-wp005-pilot-candidate` remains clean at exact WP-005 boundary `2e715af5cbd70183a43a5135d2dcd1146f1e100f`; WP-006 onward is **not** in that release candidate. GitHub authentication is unavailable in this local environment, and the connected Vercel account has no verified QCGMS project/team identity. Therefore the release-branch push and Preview have **not** occurred. Remote `main` has not been pushed. Production migration status has not been read, and no production migration or deployment occurred. A later release decision must retain the production migration gate for the existing WP-003 `UNASSESSED` migrations; this report grants no production authority.

**Development verdict: READY FOR PRODUCT OWNER REVIEW.**

**Frozen release-track verdict: BLOCKED pending human GitHub authentication and verified QCGMS Vercel project/team identity.**
