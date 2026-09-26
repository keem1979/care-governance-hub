# WP-003B — Zero-Friction Initial Capture: Gate B and Gate C evidence

**Branch:** `wp-003-zero-friction-capture`

**Protected WP-003A baseline:** `3d73f44725920725a99a4611df5bdea3d4802a02`

**Release verdict:** **BLOCKED** pending the unrestricted Chromium and mobile Playwright gate. No merge, push, deployment, production database access, or WP-003B schema migration occurred.

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
| Chromium Playwright | **BLOCKED**, 0 passed, 2 launch-blocked before assertions: `browserType.launch: spawn EPERM` in this sandbox |
| Mobile Playwright and WP-002 browser regression | **NOT RUN** after Chromium launch failure; mandatory before release approval |

The `.env` destination was checked without printing the connection string or password: only `127.0.0.1:5432/care_governance_hub_test` was used. Browser test setup reached the test stage; the two Chromium cases failed at process launch, not at a product assertion. No Playwright PASS is claimed.

Run the remaining browser gate from an unrestricted local Windows terminal in the repository root. The repository-root `.env` is loaded by Playwright config; confirm its destination privately before running:

```powershell
$env:PLAYWRIGHT_PORT = '3105'
$env:NEXT_DIST_DIR = '.next-release-gate-wp003b-e2e'
npx.cmd playwright test initial-capture.spec.ts safeguarding-rm-burden.spec.ts contextual-evidence.spec.ts evidence-controls-release-gate.spec.ts --project=chromium --project=mobile --reporter=line
```

Keep the live preview on port 3104 while using the separate E2E build directory. Do not mark Gate B PASS until these tests actually pass.

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
| Test Engineer | CONDITIONAL PASS | 383/383, 32/32 and 27/27 pass; automated browser launch blocked. |
| Release Manager | HOLD | Chromium/mobile Playwright and WP-002 browser regression remain mandatory. |

## Known follow-ups and final status

The previously known `atom-wordmark.png` aspect-ratio warning is unrelated to WP-003B. Sites/Vinext reports existing Vite native-config and dynamic-route analysis warnings and a runtime-resolved policy-branding logo asset; the build succeeds. The temporary Next.js dev indicator is disabled for the local preview; this does not affect the production build.

**Final WP-003B status: BLOCKED — not ready for Product Owner review until the unrestricted browser gate passes.**
