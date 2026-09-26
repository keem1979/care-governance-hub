# WP-003B — Zero-Friction Initial Capture: Gate B and Gate C evidence

**Branch:** `wp-003-zero-friction-capture`

**Protected WP-003A baseline:** `3d73f44725920725a99a4611df5bdea3d4802a02`

**Release verdict:** **READY FOR PRODUCT OWNER REVIEW**. No merge, push, deployment, production database access, or WP-003B schema migration occurred.

**Final browser-gate update (`510d1bfd30e41162862cf46d0f03094afc9c94e0`):** The only new committed change is a test locator for the Safeguarding Client validation message. No Incident or other product code changed.

## Delivered flow

Incident, Complaint and Safeguarding create the existing canonical RegisterEntry through the same server endpoint. The first page asks for one factual account, relevant person context, a suggested date, and the minimum module-specific classification and immediate safety position. `Unknown / evidence required` is the visible initial safety choice. A factual immediate-action note becomes required for known material harm or controlled/unresolved safety conditions. Save leads to the governed record, where investigation, notifications, Evidence, assurance and closure remain human follow-up work. The full detail editor remains available after capture.

The server derives a neutral title, authenticated owner and authorised scope, and creates the reference, history, ActivityLog and one system Evidence record. New records remain `OPEN` with canonical `UNASSESSED` risk. The Safeguarding Client relationship remains mandatory. Client and Staff searches use server-authorised IDs and tenant/location scope; the initial Staff link is carried only from authorised profile context. No parallel record type was added.

## Measured burden

Counts come from successful authenticated saves in the rendered local app with fictional records. A step is a fill, selector choice, authorised result choice, or Save press. Defaults require no step.

| Module | Before: visible / required / free text / steps | After: visible / required / free text / steps | Step reduction |
| --- | --- | --- | ---: |
| Incident | 16 / 10 / 3 / 10 | 6 / 4 / 1 / 3 | 7 (70%) |
| Complaint | 11 / 5 / 2 / 5 | 6 / 3 / 1 / 2 | 3 (60%) |
| Safeguarding | 10 / 5 / 2 / 5 | 5 / 4 / 1 / 4 | 1 (20%) |

The Safeguarding count includes typing a Client query and choosing the authorised Client result. All three saved records showed `OPEN` and `UNASSESSED`; the saved Incident and Complaint pages exposed the existing WP-002 Add Evidence action. The measured paths and field disposition are in `docs/ux/WP-003_ZERO_FRICTION_CAPTURE.md`.

## Gate B — engineering assurance

| Check | Result |
| --- | --- |
| Full unit/integration suite | **PASS**, 77 files, 383/383 tests |
| TypeScript | **PASS**, `npm.cmd run typecheck` |
| ESLint | **PASS**, `npm.cmd run lint` |
| Prisma schema validation | **PASS**, `npm.cmd run db:validate` |
| Fresh disposable migration | **PASS**, 65/65 migrations in a temporary schema; RegisterEntry default `UNASSESSED` verified; schema removed afterward |
| Applicable upgrade path | **PASS**, 65 migrations present, no pending migration on the named disposable database |
| WP-003A direct-request security | **PASS**, 27/27 including unauthorised Client/location/tenant, closed-record writes, and premature assurance |
| WP-003B direct authenticated capture gate | **PASS**, 32/32 including Client/Staff search, restricted location denial, three minimum saves, canonical record/history/ActivityLog/Evidence, required fields and forged closure |
| Next.js production build | **PASS**, compiled, TypeScript complete, 149 static pages |
| Sites/Vinext production build | **PASS**, all five build stages complete |
| Isolated Chromium Incident reproduction | **PASS, 1/1**; Incident POST 201, canonical record persisted, and detail-page navigation completed |
| Final `initial-capture.spec.ts` Chromium | **PASS, 2/2** in the unrestricted local Windows run |
| Final `initial-capture.spec.ts` mobile | **PASS, 2/2** in the unrestricted local Windows run |

The `.env` destination was checked without printing the connection string or password: only `127.0.0.1:5432/care_governance_hub_test` was used. The final isolated reproduction, Chromium and mobile output directories each contain `.last-run.json` with `status: passed` and no failed tests. The unrestricted run counts above were confirmed by the executor.

### Targeted browser diagnosis and final gate

The isolated reproduction trace at `../../outputs/WP-003B_INCIDENT_REPRO_01/initial-capture-minimum-In-f5673-anonical-unassessed-records-chromium/trace.zip` shows the Incident POST with a fictional summary, `2026-09-26` event date, `Care delivery` type, `Unknown / evidence required` harm level, and empty optional Client and location IDs. The response was HTTP 201 with ID `5fed36b0-9f8a-4eb7-9e41-1a026debec3e`. That `OPEN` RegisterEntry was verified in the disposable database. The trace shows navigation to its canonical detail page; no Incident validation or server error appeared. The sign-in HTTP 409 was the expected MFA challenge. The browser reported the previously known wordmark aspect-ratio warning.

**Original Incident failure classification: NON-REPRODUCIBLE — no evidence of product defect; test timing cannot be distinguished conclusively from environment/state because the original trace was overwritten.** No Incident implementation change was made.

Commit `510d1bf` changes only `tests/e2e/initial-capture.spec.ts`: the Safeguarding negative case now asserts the exact “Choose the client this safeguarding concern relates to.” message inside the form's validation alert. This excludes Next.js's separate route-announcer alert. Product markup and server validation are unchanged.

The final passed browser artifacts are preserved in `../../outputs/WP-003B_FINAL_CHROMIUM` and `../../outputs/WP-003B_FINAL_MOBILE`; the isolated reproduction is in `../../outputs/WP-003B_INCIDENT_REPRO_01`. Earlier local setup attempts returned HTML 404 and a duplicate fictional Risk fixture 500 before browser assertions; they were superseded by the passing unrestricted runs and did not involve an Incident product assertion. The 12 previously captured authenticated desktop/mobile screenshots remain in `outputs/WP-003_GATE_C/` as listed below.

The targeted `initial-capture.spec.ts` browser gate is complete on Chromium and mobile.

## Gate C — rendered experience

All three forms were rendered and saved in an authenticated local browser on desktop and at 390 × 844 mobile width. The mandatory Safeguarding Client combobox was filled and its authorised fictional result was selected by tap; the hidden canonical Client ID was set. The floating Abi control initially covered the mobile Client field. It is now suppressed on these three first-capture pages, and the mobile tap/search/select check passed. No horizontal clipping or duplicate form appeared in the live DOM. The original full-page mobile screenshot stitch repeated lower fragments; the final review uses clean top and scrolled viewport pairs.

| Module | Desktop top / save area | Mobile top / save area |
| --- | --- | --- |
| Incident | `outputs/WP-003_GATE_C/incident-desktop-top.png` / `incident-desktop.png` | `incident-mobile-top.png` / `incident-mobile.png` |
| Complaint | `complaint-desktop-top.png` / `complaint-desktop.png` | `complaint-mobile-top.png` / `complaint-mobile.png` |
| Safeguarding | `safeguarding-desktop-top.png` / `safeguarding-desktop.png` | `safeguarding-mobile-top.png` / `safeguarding-mobile.png` |

All 12 screenshot files are nonzero and are deliberately ignored by Git as local review artifacts. The live authenticated Incident preview is available at `http://127.0.0.2:3104/registers/incidents/new` while the local server remains running.

### Specialist verdicts

| Specialist | Verdict | Basis / limit |
| --- | --- | --- |
| RM Advocate | PASS | One account leads; Save follows essentials; later decisions are separate. |
| Form Simplicity Specialist | PASS | One routine narrative, no title/risk/owner/Evidence form burden. |
| Plain Language Reviewer | PASS | Unknown explicitly does not mean safe; module date hints now match incident/received/identified meaning. |
| UX Designer | PASS | One restrained mobile column and clear primary Save. |
| Governance QA Consultant | PASS | Canonical record, follow-up, history and human assurance preserved. |
| CQC Inspector | PASS | Copy does not imply referral, notification or assurance; urgent known conditions show escalation guidance. |
| Security/Tenancy Reviewer | PASS for reviewed scope | Server permission/scope controls and 32/32 direct gate; no production access. |
| Accessibility/Mobile Reviewer | PASS for reviewed scope | Updated unobstructed screenshots and live mobile Client result selection; independent screen-reader session not run. |
| Test Engineer | PASS | 383/383 automated tests, direct security/capture gates, isolated Incident reproduction 1/1, Chromium 2/2 and mobile 2/2. |
| Release Manager | PASS | Gate B and Gate C evidence complete for Product Owner review; no merge or deployment. |

## Known follow-ups and final status

The previously known `atom-wordmark.png` aspect-ratio warning is unrelated to WP-003B. Sites/Vinext reports existing Vite native-config and dynamic-route analysis warnings and a runtime-resolved policy-branding logo asset; the build succeeds. The temporary Next.js dev indicator is disabled for the local preview; this does not affect the production build.

**Final WP-003B status: READY FOR PRODUCT OWNER REVIEW.**
