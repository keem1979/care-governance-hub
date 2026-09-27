# WP-009 — Policy & Control Assurance Experience

**Branch:** `wp-009-policy-control-assurance` from local `main` `71832c6fe4a4a702e39b195079de72fd6210bd34` after WP-008.
**Boundary:** only fictional data and disposable `127.0.0.1:5432/care_governance_hub_test` used in browser tests. No schema change or WP-009 migration. No remote push, Preview, deployment or production access for this development work.

## Product and governance result

Policy Library leads with **Policy current work**: overdue and due reviews, drafts and available template updates appear before Policy Studio, totals, filters and the full library. Policy detail leads with the current decision and a direct document link. Nine detailed metadata rows, the large inline PDF preview and version history are preserved in disclosures. The full controlled form remains available for a draft or policy under review; search and upload fields now have accessible names.

Approval is an explicit human action on a controlled current document or generated content. The generic edit form can change only Draft or Under review status; it cannot set Approved or Archived. Approved policy details and version uploads require a separate **Start review** action first. That transition clears the current approval actor/date, records the prior state in ActivityLog and returns the policy to Under review. Restore and archived-template regeneration also clear stale current approval metadata. Prior versions and history remain. No label equates an approved or current policy with compliance or assurance.

Provider Control Library leads with drafts and reviews due. Effective versions remain immutable and activation and applied-control effectiveness remain separate human decisions. Seven fictional retired-control cards that previously filled the page are now retained within a collapsed history section. For location-restricted users, foreign-location Provider Control versions are filtered before any data reaches the client. Controlled Decision and external Obligation implementation Evidence requests now reject Evidence outside the actor's authorised and target location scope. The canonical Policy, Evidence, Risk Control and Action models remain unchanged.

## Measured RM burden

These are directly counted controls and rendered document elements, not estimated time savings.

| Measure | Before | After |
| --- | ---: | ---: |
| Explicit current-work section before Policy Studio and totals | 0 | 1, with direct Review policy link when work exists |
| Generic policy edit status choices | 4 (including Approved and Archived) | 2 (Draft and Under review); approval/archive use distinct actions |
| Policy metadata rows initially expanded on detail | 9 | 0; nine retained in Policy details disclosure |
| Large inline PDF preview initially expanded | 520 px for PDFs | 0 px; same preview retained in disclosure |
| Retired Provider Control cards initially expanded in the fictional fixture | 7 | 0; all seven retained in history disclosure |
| Required metadata fields for routine approval | 0 | 0; decision remains one explicit button |

The WP-009 policy-library browser assertion failed before implementation because **Policy current work** did not exist. The final authenticated browser run verifies the section, a real fictional policy creation → explicit approval → Start review journey, and the Provider Control current-work view on desktop and mobile. The mobile test checked the centre of **Remove policy** remains a usable hit target despite the floating assistant.

## Gate B — Engineering evidence

| Check | Result |
| --- | --- |
| Unit/integration | PASS **436/436**, 80 files at final code. |
| Focused policy/control security | PASS **11/11**; eight initial negative cases failed before the corrections. |
| Prisma, TypeScript, ESLint | PASS through `npm.cmd run check` at final code. |
| Next.js production build | PASS, 149 static pages at final code; log `outputs/WP-009_GATE_C/next-build-final.log`. |
| Sites/Vinext production build | PASS at final code; log `outputs/WP-009_GATE_C/vinext-build-final.log`. |
| Schema | No WP-009 migration. Existing disposable test database only. |

The security suite covers forged generic approval/archive, canonical content prerequisite, approved edit/upload lock, explicit review reset and audit, archived-template metadata reset, Provider Control location visibility, and Decision/Obligation Evidence location boundaries. The browser used the real disposable database and exercised the positive approval/review path; no claim is made that a screenshot alone proves server isolation.

## Gate C — Authenticated desktop and mobile

Final targeted Playwright: **Chromium 3/3 PASS, mobile 3/3 PASS**, no failure or skip. Both projects cover Policy Library, fictional draft → approval → review, Provider Control current work, no horizontal overflow and saved screenshots. All eight final images below exist and are nonzero (paths relative to the parent workspace):

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Policy Library | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-f1267-y-without-implying-approval-chromium/wp009-policy-library-chromium.png` | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-f1267-y-without-implying-approval-mobile/wp009-policy-library-mobile.png` |
| Draft decision | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-a3764-a-new-review-before-editing-chromium/wp009-policy-draft-chromium.png` | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-a3764-a-new-review-before-editing-mobile/wp009-policy-draft-mobile.png` |
| Approved position | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-a3764-a-new-review-before-editing-chromium/wp009-policy-approved-chromium.png` | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-a3764-a-new-review-before-editing-mobile/wp009-policy-approved-mobile.png` |
| Provider Controls | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-004f8-eserves-separate-activation-chromium/wp009-provider-controls-chromium.png` | `outputs/WP-009_GATE_C/final/wp009-policy-control-exper-004f8-eserves-separate-activation-mobile/wp009-provider-controls-mobile.png` |

## Specialist verdicts

| Lens | Verdict |
| --- | --- |
| System Architect / Backend | PASS: existing Policy and Provider Control lifecycles used, no schema or new assurance score. |
| RM Advocate, UX Designer, Form Simplicity, Plain Language | PASS after final rendered review: relevant review work leads; metadata and history remain accessible; Approved says **Current position**, not **What needs attention**. |
| Accessibility/Mobile | PASS for reviewed desktop/mobile scope: labelled inputs, native disclosures, visible status text, no horizontal overflow, mobile action-centre hit test. Independent screen-reader audit not performed. |
| Security/Tenancy and Governance QA | PASS for reviewed scope; no confirmed unresolved High/Critical gap. Approval and review require explicit human actions; Evidence and Control location boundaries are enforced. |
| Test Engineer | PASS: final six authenticated cases and eleven targeted security cases passed. |
| Release Manager | READY: required WP-009 checks, specialist reviews and browser gates passed; source may be merged to local `main` non-fast-forward under the standing authority. |

Known non-blocking follow-ups: the app-wide wordmark aspect-ratio warning; the previously unconfirmed mobile hydration attribute warning; Vinext Vite native-config-loader and route-classification advisories; floating assistant proximity to outer mobile content (the tested action centres remain usable); and a Governance Control Evidence picker that may show another authorised branch's Evidence before the server rejects it for the selected record. Historical cross-location links were not audited. No current permission bypass was demonstrated.

**Verdict: READY FOR PRODUCT OWNER REVIEW / authorised local non-fast-forward merge.**
