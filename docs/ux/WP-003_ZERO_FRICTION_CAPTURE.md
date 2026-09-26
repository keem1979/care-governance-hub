# WP-003 — Zero-Friction Initial Capture: Gate A

**Scope:** Incident, Complaint and Safeguarding first capture only.
**Branch:** `wp-003-zero-friction-capture`
**Protected baseline:** `37d4ebedc51f34f42c6260f649ed2d1b563e0988`
**Status:** Discovery complete; implementation **HOLD** pending the Gate A decisions below. No product code, test or schema change was made.

## Decision in brief

Use one shared first-capture pattern: record a short factual account, establish the immediate safety position, link the person and location where applicable, then save the canonical record. Keep investigation, notification decisions, Evidence, Action follow-up and assurance on the saved record. The current first-save form asks for governance decisions too early. More urgently, a rendered attempt to save each of the three forms fails because the shared risk selector submits `Low` while the API accepts `LOW`.

The design cannot be released until the server-side capture safeguards and unresolved risk semantics are settled. The discovery does **not** justify a new record type or a schema migration. An `Unknown` risk level is unavailable in the current enum; Product Owner and architecture review must decide whether risk must be selected at first save or whether a separately governed unassessed state is required. Do not silently store `LOW` for an unassessed risk.

## Evidence and measurement method

On 26 September 2026, the shared forms were inspected in a real authenticated local Next.js runtime using the fictional E2E risk-owner account and only the disposable `127.0.0.1:5432/care_governance_hub_test` database. The six screenshots in `outputs/WP-003_GATE_A/` show the rendered desktop and 390 × 844 mobile forms. No production connection was used. Counts below are from the rendered accessibility tree with optional disclosures collapsed; they exclude site navigation, the Save button, hidden inputs and date-picker subcontrols. Searchable Client/Staff and Evidence inputs count as controls, but not as free-text *content* fields. The latter are separate from typing-capable search boxes.

For interaction attempts, one step is one fill, selector choice or Save press after the form is open. Prefilled date, owner, location and risk did not add a step. The Safeguarding Client selector had one exact fictional match, so entering that exact choice took one step. A dashboard-to-form click would add one step. These are observed **attempts**, not successful-save times: all three requests returned `Choose valid status and risk values.` because of the shared risk value mismatch. Successful first-save steps and the eventual after-state therefore remain unmeasured.

| Capture | Current visible controls | Current required controls | Current free-text content fields | Other typing-capable search boxes | Observed steps through failed Save | Proposed first-capture field controls (design, not yet rendered) | Proposed free-text content fields |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Incident | 16 | 10 | 3 | 3 (Client, Staff, Evidence) | 10: 3 fills, 6 choices, Save; server rejected | 6: date, account, Client link, type, immediate safety, conditional action; plus Save | 1 routine, 2 if action needed |
| Complaint | 11 | 5 | 2 | 3 (Client, Staff, Evidence) | 5: 2 fills, 2 choices, Save; server rejected | 6: received date, account, person link, category, immediate safety, conditional interim control; plus Save | 1 routine, 2 if action needed |
| Safeguarding | 10 | 5 | 2 | 3 (Client, Staff, Evidence) | 5: 2 fills, Client link, safety choice, Save; server rejected | 5: identified date, concern, required Client link, safety, conditional protective action; plus Save | 1 routine, 2 if action needed |

The proposed counts are design budgets, **not** measured improvements. They omit owner, location and risk controls only if the server can derive safe, authorised values and the risk decision below is resolved. The Gate C before/after table must be populated from the implemented rendered flow and a successful first-save run.

### Rendered observations

- **Incident:** date (prefilled), title, account, optional Client and Staff links; seven required module fields (type, immediate response, harm, emergency services, safeguarding referral, CQC notification, Duty of Candour); risk, location and owner selectors; optional Evidence search. The page labels a date-only input “Date and time of incident.”
- **Complaint:** date (prefilled), title, account, optional Client and Staff links; required category and immediate safety; optional-detail disclosure; risk, location and owner selectors; optional Evidence search. Five more optional fields sit inside the disclosure.
- **Safeguarding:** date (prefilled), title, combined concern/protection account, required Client link and safety choice, optional Staff; optional-detail disclosure; risk, location and owner selectors; optional Evidence search. Two more optional fields sit inside the disclosure.
- The shared risk selector displays and submits `Low`, `Medium`, `High`, `Critical` without uppercase option values. The POST route validates uppercase `REGISTER_RISK_LEVELS`. Filling every other required item and pressing Save reproduced the same server error on all three forms. No new record was created by these attempts.
- On mobile, the form stacks in one column and Save follows four numbered sections, including optional Evidence. It is several screens below the first factual account.

## Existing route and data map

| Area | Existing path and responsibility |
| --- | --- |
| Shared page | `src/app/(app)/registers/[key]/new/page.tsx` loads authorised definition, locations, people and context; it marks Safeguarding Client required in the UI. |
| Shared form | `src/components/register-entry-form.tsx` renders all three forms; `RegisterDefinition.fieldSchema` supplies module fields; `src/lib/registers.ts` supplies field validation and display language. |
| Create API | `src/app/api/registers/[key]/route.ts` checks `GOVERNANCE_EDIT`, organisation-scoped definition, location, owner, Client/Staff/Evidence, then creates the canonical `RegisterEntry` and module follow-up records transactionally. |
| Canonical model | `prisma/schema.prisma` requires organisation, definition, reference, event date, title, summary, data and creator; status/risk have defaults. Existing Complaint Investigation and Safeguarding Case support draft or awaiting states. |
| History/Evidence | Create writes register history and `ActivityLog`; canonical Evidence relationships are synchronised in the same transaction. WP-002 contextual Evidence remains on the saved record. |

Existing module field definitions are in `prisma/migrations/20260828090000_incident_assurance_closed_loop/migration.sql`, `20260828130000_complaints_assurance_closed_loop/migration.sql` and `20260828170000_safeguarding_assurance_closed_loop/migration.sql`. This is an architecture map, not a request to edit historical migrations.

## Proposed first-capture pattern

1. **What happened?** One short factual account. Use neutral wording that does not presume investigation findings. Derive a safe short list title from module, date/reference and account where appropriate; retain title editing after save.
2. **Who is this about?** Use the existing authorised person/worker context when launched from a profile. Otherwise use an ID-backed, distinguishable selector. Client is required for Safeguarding; Incident and Complaint may have no known Client at first capture.
3. **When was it identified or received?** Show a date-only value suggested as today and let the RM change it. The automatic audit timestamp records the actual save time. Do not label a date-only field as date and time or imply the event itself happened today when that is unknown.
4. **Immediate safety:** show a module-specific choice including the existing “Unknown / evidence required” where supported. Ask for a concise action/containment note only when action was taken or urgent risk remains; make an explicit “not yet taken / needs follow-up” state visible instead of treating blank as safe.
5. **Save record:** keep it near the required fields on desktop and mobile. The server creates `OPEN` status, reference, attributable history and follow-up work. Do not imply that capture completes investigation, statutory decisions, effectiveness or assurance.

### Field disposition

| Field or value | Treatment | Reason and condition |
| --- | --- | --- |
| Organisation/tenant, authenticated recorder, `createdBy`, recorded timestamp, reference, initial `OPEN` status, history and ActivityLog | **Auto** | Use the verified server session and canonical create transaction; never trust browser authority. |
| Record title | **Derived** | Avoid a second required narrative. Derive a non-misleading short title; allow later edit. Do not insert an unverified clinical conclusion. |
| Owner | **Derived** | Default to current authorised active user; show and allow governed change after save. |
| Location | **Derived or Select** | Carry authorised profile/source location or sole assigned location. Where multiple scopes are possible, require an authorised choice; organisation-wide must be explicit and permitted. |
| Event/received/identified date | **Derived suggestion, confirmable** | Today is a convenience, not a verified event time. Preserve module-specific meaning and date-only precision. |
| Client/Staff | **Link** | Carry profile context or select by authorised ID. Safeguarding Client must be server required; Staff remains optional. |
| Factual account | **Type** | Justified: the event or concern cannot safely be inferred from metadata. Limit to one concise field. |
| Immediate protective/interim action | **Type, conditional** | Justified when action was taken or current risk needs a factual handover; otherwise use an explicit pending/none state. This is the only second narrative field in routine capture. |
| Risk level | **Decision required** | Existing `LOW` default and `Low` form value are unsafe/invalid. The enum lacks `UNKNOWN`; do not silently equate unassessed with low. |
| Evidence | **Link after save** | WP-002 in-context upload/reuse remains intact; Evidence is not mandatory for the first factual record. |

| Module | Keep at first save | Move to saved-record follow-up or optional detail |
| --- | --- | --- |
| Incident | Account (**Type**), incident type (**Select**), immediate harm/safety position (**Select**, with unknown), action if needed (**Type**), date and person/context as above | Emergency-services structured outcome when not immediately known; safeguarding referral, CQC notification and Duty of Candour decisions; verified harm position and investigation detail, Evidence, Actions, learning and Management Assurance. Urgent escalation remains visible in the immediate action/safety area. |
| Complaint | Account (**Type**), category (**Select**), immediate safety (**Select**, with unknown), interim control if needed (**Type**), received date and person/context | Complainant name or safe reference, relationship, preferred contact method, accessibility needs, communications, investigation, response, Evidence, Actions and assurance. Keep a rapid path for urgent safety concern. |
| Safeguarding | Concern (**Type**), required Client (**Link**), safety position (**Select**, with unknown), immediate protection if needed (**Type**), identified date | Reporter, detailed category, referral and external response, enquiry, Evidence, Actions, outcome and Management Assurance. Urgent risk must trigger attributable follow-up; capture itself is not a referral decision. |

## Gate A objections and implementation conditions

1. **Save blocker, reproduced:** the shared risk `<option>` has no uppercase `value`. All three authenticated first-save attempts on fictional data returned `Choose valid status and risk values.` This is a product defect to fix in WP-003 implementation and regression-test at API and browser levels.
2. **Assured-create bypass:** a crafted direct POST can set `CLOSED` or `ARCHIVED` on Incident, Complaint or Safeguarding and Incident `closureDate`, although the create UI hides that path. The server must force an open, unclosed initial record and reject forged closure/archival values; preserve Management Assurance and reopening controls.
3. **Safeguarding person link:** the form requires a Client, but the create API does not. Enforce the authorised Client link server-side for this module.
4. **Location scope:** a restricted user can omit `locationId` and create an organisation-wide sensitive record. Derive or require an authorised location and block unauthorised organisation-wide scope at the server.
5. **Risk unknown:** current `REGISTER_RISK_LEVELS` offers only `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Decide how to record genuinely unassessed risk before implementation. If an `UNKNOWN` enum/database change proves necessary, stop for architecture/Product Owner review before any migration.
6. **Selection semantics:** the generic API checks required module-field presence but does not check supplied select values against the published choices. Validate on the server. Do not infer referral, notification or Duty of Candour decisions.
7. **Accessible person choice:** the current datalist matches an exact display name, which can be ambiguous for duplicate names. Use an authorised ID-backed result with distinguishing metadata and verify keyboard, screen reader, focus and mobile selection.

The existing API already checks organisation-scoped definitions, `GOVERNANCE_EDIT`, authorised location IDs, same-organisation active owner, scoped Client/Staff/Evidence and transactional history/Evidence synchronisation. The implementation must preserve those checks and add negative tests for the bypasses above, cross-tenant/location IDs, unauthorised roles and closed/archived protection.

## Specialist Gate A verdicts

| Specialist | Verdict | Evidence or condition |
| --- | --- | --- |
| Repo Cartographer | PASS for architecture map | One shared page/form/API and canonical `RegisterEntry`; no new entity needed. Flagged Safeguarding API gap and risk value mismatch. |
| RM Advocate | CONDITIONAL PASS for proposal; current form FAIL | Preserve a factual account, when known, who is affected, immediate safety and rapid escalation; move later decisions out. |
| Form Simplicity Specialist | CONDITIONAL PASS | At most two routine narrative fields, one where no action is needed; no duplicate title typing. |
| Plain Language Reviewer | PASS for proposed language, with corrections | Correct “date and time” date-only label, “Verified harm position” and complaint wording that assumes the person receiving care complained. |
| UX Designer | CONDITIONAL PASS for proposal; current form FAIL | Consistent short first-save hierarchy, visible Save before optional Evidence/follow-up; mobile currently requires long scrolling. |
| Governance QA Consultant | CONDITIONAL PASS | Keep attributable facts, date and immediate safety/action; prompt governed follow-up rather than front-loading investigation. |
| CQC-style Inspector | CONDITIONAL PASS | Accurate, contemporaneous records and prompt risk response remain essential; do not claim capture establishes compliance or completes a notification. See CQC [Regulation 17](https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-17), [Regulation 12](https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-12) and [notifications](https://www.cqc.org.uk/guidance-regulation/notifications). |
| Security/Tenancy Reviewer | HOLD | Direct-create status/closure, Safeguarding Client and organisation-wide scope gaps require server guards and negative tests. |
| Accessibility/Mobile Reviewer | CONDITIONAL PASS for design | Current labels, native required controls and alert exist; verify ID-backed person selection, help/error association, focus, keyboard, touch targets and mobile Save reachability after implementation. |

**Gate A outcome:** The discovery and proposed reduction are ready for Product Owner/ChatGPT review. Implementation is **on hold** until the risk representation and security conditions are agreed. No Gate B or Gate C result is claimed.

## Rendered evidence

- `outputs/WP-003_GATE_A/incident-before-desktop.png`
- `outputs/WP-003_GATE_A/incident-before-mobile.png`
- `outputs/WP-003_GATE_A/complaint-before-desktop.png`
- `outputs/WP-003_GATE_A/complaint-before-mobile.png`
- `outputs/WP-003_GATE_A/safeguarding-before-desktop.png`
- `outputs/WP-003_GATE_A/safeguarding-before-mobile.png`
- `outputs/WP-003_GATE_A/incident-current-save-error.png`

All seven PNG files were verified non-zero. The desktop and mobile screenshots contain fictional test data only. The optional disclosure and mobile screenshot stitching can repeat page fragments in full-page captures; these were not counted as duplicate controls.

## WP-003A — Capture integrity hardening

**Status:** Complete for architecture and security review. WP-003B visual capture simplification has not started.

The shared capture form now sends canonical risk values. New governed register entries default to explicit `UNASSESSED`, while existing assessed values remain unchanged. `UNASSESSED` is shown distinctly in register details, lists, My Work and management queues, and cannot be treated as Low. Incident, Complaint and Safeguarding assurance and relevant investigation/final-response milestones reject unassessed risk. Care Plans continue to require an assessed risk; a new Action linked from an unassessed source requires a human priority choice.

The server now enforces open initial status, closed-record write protection, authorised tenant/location/Client relationships, and Safeguarding's required Client link. A location-restricted user with one authorised location gets that scope automatically. An organisation-wide record requires authority for that scope. The register create transaction still creates one canonical record, history, ActivityLog and the existing Evidence relationship. WP-002 contextual Evidence behaviour was not redesigned.

### Schema and migration

- `RegisterRiskLevel` adds `UNASSESSED`; the `RegisterEntry.riskLevel` default becomes `UNASSESSED`. The Care Plan default remains `LOW` and Care Plan APIs reject `UNASSESSED`.
- Two ordered migrations are required because PostgreSQL cannot use the newly added enum value in the same migration transaction: `20260926090000_wp003_add_unassessed_register_risk` and `20260926090100_wp003_default_unassessed_register_risk`.
- Upgrade migration on the named disposable local database passed: 65 migrations total, with both WP-003A migrations applied. Fresh migration in a newly created isolated schema within that disposable database passed all 65 migrations, verified the new register default, then dropped the isolated schema. No production database was contacted.

### Successful current-form baseline

On 26 September 2026, the existing full forms were completed in an authenticated local browser against fictional data in the disposable database. Counts use the same visible-control method as Gate A; interactions count fills, selector choices and Save after the form is open. The three saves produced canonical detail pages. The clean Incident run followed the correction to an unrelated assessment-prerequisite helper that had prevented register saves.

| Current form | Visible controls | Required controls | Free-text content fields | Interactions to successful Save | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Incident | 16 | 10 | 3 | 10: 3 fills, 6 selections, Save | Saved `/registers/incidents/ec80e3d2-f29f-4358-83f5-601052125658` |
| Complaint | 11 | 5 | 2 | 5: 2 fills, 2 selections, Save | Saved `/registers/complaints/6f9b33e4-2273-4be1-b604-f48bd3017316` |
| Safeguarding | 10 | 5 | 2 | 5: 2 fills, authorised Client link, safety selection, Save | Saved `/registers/safeguarding/7825304a-ece0-4346-88c2-802c1e5a4fe9` |

These are the measured **before** values for WP-003B, not a claim of burden reduction. The date, owner, location and unassessed risk defaults required no interaction. Client/Staff and Evidence search boxes are visible controls but are not counted as narrative fields. The Safeguarding Client choice had one exact fictional match.

### WP-003A assurance

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS.
- `npm.cmd run db:validate`: PASS.
- `npm.cmd run test`: 76 files, 379/379 tests PASS.
- Direct authenticated HTTP gate using fictional accounts and the disposable database: 27/27 PASS. It covered invalid risk, forged closed status/closure date, closed record writes, assessed-open archive, missing/unauthorised Safeguarding Client, forged tenant/location/organisation-wide scope, cross-tenant IDs, single-location derivation, contextual Evidence scope and unassessed Incident/Complaint/Safeguarding progression.
- Authenticated browser form saves: Incident, Complaint and Safeguarding PASS. An attempted Chromium Playwright run could not launch its browser in the restricted sandbox (`spawn EPERM`); no Playwright assertion result is claimed for WP-003A. Full desktop/mobile automation belongs to the combined Gate B after WP-003B.
- Security/Tenancy Reviewer: **PASS** after 27/27 direct-request results and code review.
- Solution Architect: **PASS** after downstream `UNASSESSED` review and migration review.

WP-003B may begin only after the Product Owner/ChatGPT review of this WP-003A report. No merge, push or deployment was performed.

## WP-003B — Zero-friction initial capture

The accepted WP-003A integrity layer remains in place. Incident, Complaint and Safeguarding now use a short first-save presentation of the same canonical `RegisterEntry` route. The server derives a neutral title from the factual account, sets an accountable owner, and preserves the existing transaction for history, ActivityLog, module follow-up and one system-generated canonical Evidence record. The full detail editor and governed workflows remain on the saved record. No further schema migration was introduced.

### Field disposition and rationale

| Current control | Disposition at first save | Reason |
| --- | --- | --- |
| Title | DERIVE | The factual account supplies a neutral short title; the person can edit it later. |
| Factual account / summary | TYPE | The event or concern cannot safely be inferred. This is the one routine narrative field. |
| Event, received or identified date | DERIVE suggestion, SELECT to correct | Today is suggested and explicitly changeable; date-only wording does not claim a verified time. |
| Client/person | LINK | ID-backed authorised search; required for Safeguarding, optional for Incident and Complaint, profile context carried when authorised. |
| Staff | MOVE LATER or LINK from authorised profile context | Staff selection is not routine first-save work; known authorised context is retained. |
| Incident type | SELECT | The short classification supports triage without claiming a finding. |
| Incident verified harm position | SELECT with explicit Unknown default | Unknown is visible and blocks later assurance; a positive harm judgement is not invented. |
| Incident immediate response | TYPE conditionally | Required for known moderate or greater harm; otherwise added only when an immediate action has occurred. |
| Emergency services, safeguarding referral, CQC notification, Duty of Candour | MOVE LATER | These are accountable human decisions in Incident follow-up. They remain blank at first save. |
| Complaint category | SELECT optionally | Classification can follow the factual report without blocking capture. |
| Complaint immediate safety | SELECT with explicit Unknown default | Unknown is not a statement of safety; controlled or action-required choices require an immediate response note. |
| Complaint interim response | TYPE conditionally | Records actual control or action needed without forcing a second narrative routinely. |
| Complainant name, relationship, contact preference and accessibility details | MOVE LATER | Retained in the saved Complaint investigation rather than guessed on first save. |
| Safeguarding safety position | SELECT with explicit Unknown default | The Client link and visible safety position remain; unknown/unresolved positions stay open for follow-up. |
| Safeguarding immediate protection | TYPE conditionally | Controlled or unresolved risk requires a factual protection or escalation note. |
| Safeguarding reporter | MOVE LATER | The recorder is attributed automatically, but is not assumed to be the person who raised the concern. |
| Risk, status, organisation, recorder, timestamp, reference and owner | AUTO | Server-authorised `UNASSESSED`, `OPEN`, tenancy, identity, history and accountable owner are not browser judgements. |
| Location | DERIVE or SELECT | Sole authorised location is applied automatically; multiple authorised locations remain a scoped choice. Organisation-wide is offered only to authorised users. |
| Evidence search and metadata | MOVE LATER | The saved record retains the WP-002 Add Evidence upload/reuse action. |

### Measured successful first-save burden

The measurements below are from rendered authenticated browser forms with fictional data in the named disposable local database. A step is a fill, selector choice, result choice or Save press after opening the form. The safety control visibly starts at `Unknown / evidence required`, which means follow-up is needed; no safety or risk judgement is inferred. The Safeguarding Client search requires a search fill and one ID-backed result choice. Optional action fields are collapsed unless the selected safety position requires them.

| Module | Before visible / required / free-text / steps | After visible / required / free-text / steps | Successful saved-record evidence |
| --- | --- | --- | --- |
| Incident | 16 / 10 / 3 / 10 | 6 / 4 / 1 / 3 | `/registers/incidents/d134cb3e-61cb-4633-a2c8-99e192c1ea15` |
| Complaint | 11 / 5 / 2 / 5 | 6 / 3 / 1 / 2 | `/registers/complaints/43ac4a26-d602-4216-8251-1d56e4c9ea3e` |
| Safeguarding | 10 / 5 / 2 / 5 | 5 / 4 / 1 / 4 | `/registers/safeguarding/8d076b6f-aab5-4ca3-addb-9d42bda1868a` |

The form remains one page on mobile, with Save directly after the essential fields. The authorised person search uses IDs and distinguishing references, rather than exact display-name matching. Full-name search, keyboard interaction and mobile rendering require the final browser gate below.
