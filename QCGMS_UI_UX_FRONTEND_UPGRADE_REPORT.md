# QCGMS UI/UX Frontend Upgrade Report

## Release boundary

- Baseline inspected: `bfac3f9`
- Scope: shared navigation, Management Command Centre, Incident/Complaint/Safeguarding presentation, Actions & Improvement, Evidence relationships, governed timelines and Management Oversight
- Assurance behaviour changed: **No**
- Database/schema changes: **None**
- Production status: **Not deployed**

## Existing UX problems

The audit found a strong governance backend presented through an interface that often gave every number, field and workflow step equal visual weight.

- The former dashboard displayed many same-weight cards and a generic completion/readiness treatment. It did not make the next management decision sufficiently obvious.
- Incident, Complaint and Safeguarding registers used generic wide tables even though the RM's task is exception-led triage and follow-up.
- Initial capture exposed system-owned fields and later-stage information before the record existed.
- Reference and status controls appeared editable during creation even though QCGMS can safely create the reference and start the governed record as Open.
- Evidence used a browser multi-select requiring Ctrl/Command and offered poor search, context and mobile usability.
- Record detail headers did not consistently show person, location, owner, stage and the immediate assurance position together.
- Navigation separated mature assurance capabilities from their management purpose by placing them inside a broad Registers collection.
- The visual hierarchy was frequently card-heavy and oversized for repeated daily RM work.

## Frontend audit classification

| Area | Classification | Decision |
| --- | --- | --- |
| Dashboard | Replace | Rebuilt as an exception-led Management Command Centre. |
| Incident register | Replace | Generic table replaced with an actionable worklist. |
| Complaint register | Replace | Generic table replaced with an actionable worklist. |
| Safeguarding register | Replace | Generic table replaced with an actionable worklist. |
| Incident/Complaint/Safeguarding detail | Improve | Shared record header and attention summary added; domain-specific assurance remains intact. |
| Initial assurance capture | Improve | Required-now and later information separated; system-owned fields removed from the initial task. |
| Evidence selection in capture | Replace | Searchable, touch-friendly checklist replaces browser multi-select. |
| My Work | Keep / polish | It remains the signed-in user’s task-led delivery surface and is materially different from management oversight. |
| Management Oversight | Restructure | Rebuilt as exception-led organisation/location accountability without creating another task lifecycle. |
| Evidence Library | Keep; improve relationships | The canonical library remains intact while authorised search, preview and in-context reuse are improved. |
| Calendar | Keep / polish later | Existing month/list modes serve a clear deadline purpose. |
| Risk register | Deliberately retain table | Comparing inherent/current/target scores is a genuine tabular task. |
| Audits | Deliberately retain table | Score, progress and review comparison benefits from aligned columns. |
| Client directory | Deliberately retain table for now | Directory comparison and controlled identity lookup remain useful; profile experience is a later slice. |
| Workforce | Deliberately retain table for now | Compliance comparison across staff remains a valid table use. |
| Actions | Replace table / restructure | Daily management is now worklist-first; the canonical Action lifecycle is unchanged. |
| Policies and other operational registers | Keep / audit later | Not changed before the three assurance pilots prove the shared pattern. |

## Pages improved

- `/dashboard`
- `/registers/incidents`
- `/registers/complaints`
- `/registers/safeguarding`
- `/registers/incidents/new`
- `/registers/complaints/new`
- `/registers/safeguarding/new`
- Incident, Complaint and Safeguarding record detail headers and attention summaries
- Incident, Complaint and Safeguarding governed management timelines
- Action assurance Evidence linking
- `/management` organisation, RM and location oversight views
- Global application navigation

The shared frontend primitives are intentionally small: `GovernanceWorklist`, `QuickViewNav`, `RecordHeader` and `AttentionStrip`. They consume existing server data and do not introduce another governance model.

## Tables removed

The generic register table was removed from the three assurance pilots:

- Incidents
- Complaints
- Safeguarding

Each row now states the reference, workflow stage, person, location, owner, supporting Action/Evidence counts and the reason it needs attention. The whole item opens the governed source record.

## Tables deliberately retained

- Risk: score comparison is central to the task.
- Workforce: staff-by-requirement comparison remains useful.
- Client directory: identity and service-status comparison remains useful pending the profile slice.
- Audits: progress and score comparison is useful.
- Audit/history logs: chronological fact comparison is inherently tabular or timeline-based.

Tables will not be removed merely for visual novelty. They are retained where aligned columns materially improve comparison.

## Auto-fill introduced

For new Incident, Complaint and Safeguarding records, QCGMS now makes known context visible and carries it into the existing save flow:

- Organisation from the authenticated tenant
- Recorded by from the authenticated user
- Recorded timestamp on save
- Current date as the safe default, still correctable for an earlier event
- Location when the user has one authorised location
- Follow-up owner from the authenticated user
- Reference generated by the existing server workflow
- Initial status fixed to Open by the governed creation flow

No closure date, assurance decision or professional judgement is inferred.

## Searchable selectors introduced

- Client remains a controlled selector over authorised Client Directory records; manual client identity is not stored from free text.
- Staff remains a controlled selector over authorised Workforce records; manual staff identity is not stored from free text.
- Evidence is now searched on demand by title, taxonomy and source metadata, then selected with accessible checkboxes rather than Ctrl/Command multi-select.
- Initial payloads remain bounded for active Clients and current staff. Evidence is no longer preloaded into Incident, Complaint or Safeguarding capture; the server-backed endpoint returns at most 20 authorised matches.

The Actions slice replaced its owner, oversight, Client, Staff and Evidence payloads with authorised server-backed selectors. This Evidence relationship slice extends the same scoped Evidence search to Incident, Complaint and Safeguarding capture while preserving their canonical register-to-Evidence joins.

## Manual input removed

- New-record reference field removed: the existing server creates it.
- New assurance-record status selector removed: records begin Open.
- System context is displayed rather than re-entered.
- Optional domain fields no longer block initial capture.
- Evidence selection no longer requires keyboard-modified multi-selection.

Professional narrative remains required for the factual title/summary and any domain field genuinely required at initial capture.

## Duplicate entry removed

- Existing Client and Staff records are linked instead of retyped.
- Existing Evidence is linked instead of described again.
- Organisation, user and location context are reused from the authenticated session.
- Central Action and Evidence lifecycles remain canonical; no IncidentAction, ComplaintAction or SafeguardingAction frontend model was introduced.

## Progressive disclosure improvements

Initial capture now distinguishes:

1. Required now — factual identity, date, title/summary and genuinely required domain data.
2. Known context — organisation, recorder and scope supplied by QCGMS.
3. Optional information already known — collapsed and explicitly safe to complete later.
4. Responsibility and immediate risk — safe defaults that can be corrected.
5. Existing Evidence — optional during initial capture.

Investigation, findings, communications/referral, effectiveness, assurance, closure and reopening remain on the governed record after creation.

## Navigation improvements

- Dashboard is now labelled **Command Centre**.
- Management Command is now labelled **Management Oversight** to clarify that it is deeper role-based oversight rather than another dashboard.
- A dedicated **Assurance** group surfaces Incidents, Complaints, Safeguarding, Risks and Audits directly.
- A **Governance** group contains Actions & Improvement, Evidence, Policies, Governance Meetings and the remaining operational registers.
- Active-route handling prevents “All operational registers” appearing active while a specific assurance register is open.

## Click reduction

- Register rows open the source record in one click without horizontal table navigation.
- Quick views expose Needs attention, Mine, Critical and Closed without opening a filter panel.
- The RM no longer clicks or types into Reference or initial Status.
- Optional fields are skipped by default rather than traversed before save.
- Evidence can be found and checked directly without keyboard-modified selection.

## Assurance UX improvements

Every mature assurance record now begins with a consistent header showing:

- reference;
- title;
- workflow stage;
- record/risk status;
- linked person;
- location;
- owner;
- permitted next actions.

An attention strip then shows one of:

- Critical record requires active oversight;
- What requires attention, with outstanding assurance reasons;
- Ready for management assurance;
- Authorised closure recorded.

“Ready” is not “Closed”. Authorised human judgement, closure authority and existing server-side checks remain required.

## Actions & Improvement UX upgrade

### Audit findings and decisions

| Area | Classification | Implemented decision |
| --- | --- | --- |
| Action list | Replace table / restructure | Replaced the default wide grid with a paginated exception-led worklist. |
| Action creation | Simplify / auto-fill / typeahead | Kept core governance questions visible, moved optional detail behind disclosure and reused source context. |
| Action detail | Polish / timeline | Added the shared record header, explicit attention state and a governed user-facing timeline. |
| Progress updates | Simplify | Reduced the task to what changed, current progress and optional Evidence; attribution and time remain automatic. |
| Completion | Keep / polish | Preserved completion as a separate governed submission and clarified that 100% is not closure. |
| Verification | Keep / polish | Preserved independent verification and presents the required work, statement, Evidence and expected outcome together. |
| Effectiveness | Keep / polish | Preserved human effectiveness judgement and keeps it separate from completion and verification. |
| Closure | Polish | Added plain-language readiness reasons without bypassing canonical authority checks. |
| Improvement Plans | Polish | Plans organise and summarise canonical Actions; they do not create a second task lifecycle. |
| My Work | Polish | Action items now say what decision or work is required. |
| Command Centre | Polish | Links enter meaningful Action exception views rather than a generic register. |
| Mobile | Polish | Removed the daily dependency on a horizontal table and validated the full representative flow. |

### Worklist and quick views

The default Actions page now answers what must happen, who owns it, when it is due, why it matters, its current stage and the next legitimate step. It provides the smallest useful set of operational views:

- Needs attention (default)
- Mine
- Overdue
- Due soon
- Awaiting verification
- Awaiting effectiveness
- Ready for closure
- Critical / High
- All

Search, advanced filters and pagination remain server-side. Each item includes source context, location, delivery and oversight owners, due position, Evidence count and a task-specific call to action. The page retrieves its visible page and related summaries without a per-row query loop.

### Action creation and auto-fill

Source hand-offs continue to create the one canonical Action record. QCGMS carries forward every safe known value:

- authenticated organisation and current user;
- server-generated Action reference and creation timestamp;
- source type, source identifier, source reference and source context;
- location where supplied by the governed source;
- linked Client and Staff references derived by the server where applicable;
- proposed title, description, category, priority, expected outcome and success measure;
- suggested delivery and oversight owners only where the authenticated scope and role make that safe.

The RM reviews or amends these values before deliberate creation. QCGMS does not silently create an Action. A source deadline is offered only when a real governed deadline exists. Incident, Complaint and Safeguarding hand-offs now leave the due date for confirmation instead of inventing one; Risk uses its actual treatment target and Audit uses its actual review date.

For a manual Action, the primary questions are what must be achieved, delivery owner, due date, oversight owner, priority, expected outcome and success measure. Source, affected records, Evidence and more detailed controls are available only when relevant.

### Authorised server-backed selectors

A reusable asynchronous selector now supports:

- Action owner;
- oversight owner;
- Client;
- Staff;
- governed Evidence.

The `/api/actions/authorised-options` read endpoint enforces authentication, Action-management permission, tenant scope and location scope before returning at most 20 matches. Search is debounced and provides loading, no-results, clear-selection, keyboard and touch interactions. Unmatched text never creates an identity. Existing selected records are loaded explicitly so edit and source-handoff flows remain stable without downloading an entire directory.

The governed source catalogue remains bounded by the existing source relationship design. A cross-module server-backed source search should follow the planned typed governance-relationship architecture rather than introduce loose identifiers in this UI slice.

### Evidence relationship experience

Existing governed Evidence can be found and linked from Action creation through the authorised asynchronous selector. On Action assurance, **Link Evidence** opens a native modal side drawer that keeps the RM in context and follows the deliberate sequence **Find → Preview → Link → Reuse**.

The drawer does not create a second Evidence store or relationship lifecycle. Search and linking use the existing canonical Evidence and `ActionEvidence` services. Suggestions are deterministic: Evidence attached to an Incident, Complaint or Safeguarding source is shown only after the source record passes the same tenant/location scope. Recent and searched Evidence remain bounded and authorised. Safe preview exposes governance metadata—not file contents—including taxonomy, currentness, dates, source reference, location and latest verification state.

Incident, Complaint and Safeguarding capture now use the shared `/api/evidence/authorised-options` endpoint rather than downloading a recently updated Evidence catalogue into the page. The endpoint requires governance/Action capability, applies tenant and location scope, validates requested location and returns at most 20 records. Existing selected Evidence is loaded explicitly during edit so governed relationships remain stable.

This reduces duplicate-upload pressure: users see source-related or existing governed records before deciding that a new upload is genuinely required. The UI never interprets a linked record as proof that a control worked; verification, effectiveness and management assurance remain separate decisions.

### Lifecycle, progress and assurance

The Action header now shows its purpose, source, owner, due position, stage and immediate next task. A restrained lifecycle communicates only achieved/current/future stages:

`Assigned → Completed → Verified → Effective → Closed`

There is no percentage assurance score and no visual claim that a future stage has been achieved. The detail and assurance pages use canonical readiness checks and plain-language prompts such as completion Evidence required, verification required, effectiveness review required, or authorised closure required.

Progress entry asks primarily, “What changed since last update?” and optionally accepts a progress position and linked Evidence. Action reference, user, timestamp, organisation and location remain system context. External-dependency details remain available in advanced progress controls so `Blocked` is accompanied by dependency and follow-up information rather than becoming a passive status.

Completion, verification, effectiveness and closure remain distinct server-governed acts. Reaching 100% explicitly submits work for verification; it does not verify, demonstrate effectiveness, close the Action or reduce a source Risk.

### Improvement Plans, My Work and Command Centre

Improvement Plans now summarise their grouped canonical Actions by stage and open the underlying Action. My Work uses task language such as verification required, effectiveness review required and overdue Action. Command Centre links land in the relevant Action exception view. No parallel Improvement Plan task, dashboard lifecycle or hidden Action status was introduced.

### RM administrative-burden result

| Test | Result |
| --- | --- |
| New Action from a governed source | Meaningful source identity and context are not retyped. The RM normally confirms the proposed work/outcome and selects missing accountable owners and a real due date. |
| Auto-fill | Organisation, current user, timestamp/reference, source type/reference/id/context, location, affected Client/Staff where applicable, and safe proposed Action wording/outcomes. |
| Repetition | No meaningful source narrative has to be copied into another independent task system. |
| Owner | Authorised server-backed search; no full workforce download and no free-text identity creation. |
| Evidence | Existing canonical Evidence can be searched and reused; no re-upload is required. |
| Progress | One short change statement plus optional progress/Evidence; known metadata is automatic. |
| Verification | Required work, submitted completion, Evidence and expected outcome are available in the coherent assurance view. |
| Effectiveness | Expected result, completed work, verification and Evidence remain together; the authorised user records the judgement. |
| Closure | The assurance view lists the exact blockers or states that the Action is ready for authorised closure. |

The reduction is qualitative rather than a misleading click score: source hand-offs remove repeated identity/context entry, directory selection becomes searched rather than downloaded, and later governance decisions stay separate without asking for known metadata again.

### Actions accessibility and mobile

- Async selectors use labelled combobox interaction, keyboard navigation, explicit loading/no-results states and clear controls.
- Quick views are a named navigation region with visible current state.
- Worklist items are semantic links with status expressed in text, not colour alone.
- Controls retain visible focus treatment and practical touch sizes.
- The mobile Action gate covers the worklist, creation, server-backed owner search, detail and assurance flow without horizontal overflow.

### Actions performance and security

- The worklist remains server-paginated at 20 records and does not load the full Action register.
- Owner, oversight, Client, Staff and Evidence searches return no more than 20 authorised matches.
- Cross-location selector access returned `403`; cross-tenant search returned no foreign data.
- Existing 5,000-record Evidence search probes remained fast (targeted approximately 3.8 ms; broad approximately 6.2 ms in the local release gate).
- The combined gate found no N+1 regression in the visible Action worklist path.

A separate synthetic 5,000-Action worklist benchmark was not added merely to inflate the gate. The page is bounded and server-paginated, but representative very-large-tenant Action timings should be captured as an operational performance baseline when production-like data is available.

### Actions governance regression

The canonical lifecycle, central Evidence, authority, tenant/location scoping, source relationships and history were not replaced. No schema migration was required. The only new API is a read-only, permission-scoped selector endpoint.

The combined release gate passed fresh and upgrade migrations, 357/357 automated tests, the complete desktop assurance suite and the complete representative mobile suite. The final run completed all nine desktop scenarios and all five mobile scenarios without a product assertion failure.

## Evidence relationships and Management Oversight UX upgrade

### Evidence relationship audit

The canonical Evidence Library and existing relationship tables were retained. No `ActionEvidence` substitute, local drawer cache, loose cross-module ID or new upload workflow was introduced. The audit found two material frontend gaps: register capture still downloaded a fixed recent Evidence list, and Action assurance exposed search inline without a focused preview-and-reuse flow.

The implemented relationship pattern is now:

**Find → Preview → Link → Reuse**

It preserves the distinction between a record being present and that record demonstrating completion, verification, effectiveness or closure.

### Evidence drawer / slide-over

Action assurance now opens an in-context native dialog from **Link Evidence**. It:

- keeps the underlying Action visible as the user’s work context;
- separates source-related Evidence from recent or searched results;
- supports role selection for Source, Completion, Verification, Effectiveness and Closure;
- uses native dialog focus containment, Escape handling and focus return;
- provides practical mobile touch targets and a full-height single-column mobile layout;
- links selected records through the existing canonical Action Evidence endpoint.

Already-linked records are clearly labelled and cannot be linked again. Human selection remains deliberate.

### Server-backed search

The shared async Evidence selector now calls `/api/evidence/authorised-options`. The server:

- requires an applicable governance or Action permission;
- applies tenant and authorised-location scope before search;
- rejects an unauthorised requested location with `403`;
- searches title, category/type and source metadata;
- returns at most 20 results;
- returns no foreign-tenant records.

Incident, Complaint and Safeguarding create/edit experiences use this endpoint. Existing selected Evidence is carried into edit as initial options, preventing broken historical relationships without downloading a full catalogue.

### Evidence preview

Preview intentionally exposes only safe management metadata:

- taxonomy family/type;
- currentness;
- Evidence and review/expiry dates;
- source name/reference;
- service location;
- latest verification state.

File content is not opened implicitly and the presence of metadata does not create a compliance claim.

### Source-related suggestions

For Actions sourced from Incident, Complaint or Safeguarding, source-related suggestions are resolved through the canonical source record and its existing Evidence links. The source is first checked through register scope, so a guessed source ID cannot widen access. Loose string matching and AI inference were deliberately rejected for this slice.

Where a safe deterministic relationship is not available, QCGMS falls back to bounded recent/search results and lets the authorised manager decide relevance.

### Duplicate-upload reduction

Users can now search and preview existing Evidence at the point of work before uploading anything new. Register capture no longer presents a fixed 200-record browser payload that becomes stale or encourages re-upload when the required item is outside that window. This materially improves reuse while preserving the governed upload/version lifecycle for genuinely new Evidence.

### Timeline extension

Incident, Complaint and Safeguarding detail pages now show a governed management timeline assembled from canonical records. Depending on the domain, it includes creation, investigation, communications/referral events, assurance decisions, linked Action creation and closure/reopening.

This timeline is separate from the deeper technical audit history. It does not overwrite, summarise away or fabricate audit events. The browser regression exposed duplicate visible references where a management event and the canonical section both correctly show the same fact; tests were scoped to the intended semantic element rather than removing either governed presentation.

### Management Oversight audit

Management Oversight previously depended heavily on similar cards and Action-only signals. It now answers the distinct question:

**What is happening across the services for which I am accountable?**

It remains separate from:

- **Command Centre** — what needs attention today;
- **My Work** — what the signed-in person needs to do;
- **Management Oversight** — where governance pressure, ownership and assurance gaps sit across accountable services.

No parallel task, notification or management lifecycle was created.

### Organisation overview

The organisation view begins with one five-second attention strip rather than a wall of equal-weight KPIs. It prioritises Critical matters, then overdue governance, and names the location with the greatest actual exception pressure. External dependencies and missing oversight owners appear as explicit warnings. A reassuring total can never outrank a Critical exception.

### Location drill-down

The location view shows local accountability, assigned canonical Actions, delegated management cover and source-record exceptions. Every exception drills into the canonical Incident, Complaint, Safeguarding, Risk, Audit, Action or external-dependency record rather than a dashboard copy.

The data layer now includes bounded active Incident, Complaint and Safeguarding exceptions alongside the existing Action/Risk/Audit signals. It surfaces high/Critical matters, overdue response/referral positions, readiness for assurance and unresolved safety/evidence states using plain-language reasons.

### Tables retained and why

One compact table is deliberately retained for desktop location comparison because aligned columns materially help leaders compare Critical, overdue, awaiting-assurance, external and total exceptions across services. It contains no invented performance score. Critical rows are visually dominant. On mobile, the same information becomes stacked summaries to avoid horizontal scrolling.

Actions and governance exceptions remain worklists because the management task is intervention, not column-by-column analysis.

### Worklists introduced

Management exceptions use the shared `GovernanceWorklist` pattern. Each item states the source, reference, location, owner, current state, why attention is required and the canonical next link. Critical items sort before merely overdue items; missing Evidence/assurance remains visible without being converted into a misleading percentage.

### Mobile and accessibility

- Evidence drawer validated as a full-width, full-height mobile interaction with no page overflow.
- Management Oversight summary validated on mobile without horizontal overflow.
- Native dialog supplies focus trapping and Escape behaviour; the close control is explicitly labelled.
- Search, roles, checkboxes and link controls have programmatic labels and practical touch sizes.
- Oversight status is communicated in text as well as colour.
- The desktop comparison table has real headers and is replaced—not squeezed—on mobile.

### Performance

All new searches remain server-bounded. In the final 5,000-record local probe:

- targeted Evidence search executed in approximately **6.8 ms**;
- broad authorised Evidence ordering executed in approximately **7.2 ms**;
- Complaint overdue lookup executed in approximately **1.25 ms**;
- Safeguarding overdue lookup executed in approximately **1.27 ms**.

Management register input is bounded to active assurance records relevant to the authorised scope. No per-row Evidence or Action query was added to the visible worklist path.

### RM administrative-burden result

| RM task | Result |
| --- | --- |
| Find existing Evidence | Search in context; no full Evidence catalogue or module switching required. |
| Judge relevance | Preview safe metadata and source provenance before linking. |
| Reuse Evidence | Link the existing governed record; no duplicate upload or copied description. |
| Capture Incident/Complaint/Safeguarding Evidence | Server-backed authorised lookup; selected historical links remain available during edit. |
| Understand a record | Governed management timeline assembles meaningful events from existing records. |
| Compare services | One exception-led location comparison; no invented composite score. |
| Investigate an exception | One canonical source link from the worklist. |
| Know what is most serious | Critical always precedes overdue or reassuring totals. |

### Security validation

- Cross-location Evidence option search returned `403` for an unauthorised location.
- Cross-tenant Evidence search returned no foreign records.
- Action source-related Evidence resolves only after the source passes register tenant/location scope.
- Action Evidence mutation continues to validate canonical Action and Evidence scope server-side.
- Management aggregation uses the authenticated tenant and authorised location filters for both reads and drill-down inputs.
- No client-side filter is treated as a security boundary.

### Governance regression

This slice changes presentation and authorised read/query composition only. It introduces no schema migration and does not alter Incident, Complaint, Safeguarding, Action or Evidence lifecycle semantics. Verification, effectiveness, closure authority, reopening, risk scoring and append-only history remain unchanged.

Final validation: **357/357 automated tests**, **9/9 desktop**, **5/5 mobile**, fresh **0 → 63**, committed-baseline **60 → 63**, seeded legacy upgrade, production Next.js build and Sites/Vinext build all passed.

## Mobile improvements

- Worklist items collapse to a single-column action summary instead of forcing a wide register table.
- Quick views scroll horizontally without widening the page.
- Record actions wrap inside the shared header.
- Evidence choices are full-width checkbox targets rather than a narrow multi-select.
- Capture cards use reduced mobile padding while retaining 44px-class controls.

## Accessibility

- Quick views use a named navigation landmark and `aria-current`.
- Worklists and attention summaries use named regions.
- Evidence selection uses a fieldset, legend and native checkboxes.
- Status is expressed in text as well as colour.
- Links/buttons retain visible focus treatment and descriptive labels.
- Known context is readable text rather than placeholder-only content.

## Performance

- Register pagination remains server-side at 20 records.
- Quick-view, search, status and risk filtering remain server-side.
- Action counts are loaded once for the visible register page rather than queried per worklist item.
- Initial Client, Staff and Evidence selector payloads are bounded.
- No new client data-fetching framework or dependency was introduced.

The Actions slice now uses server-backed typeahead for large directories and Evidence libraries. The next performance step is a production-like large-tenant Action worklist baseline and operational monitoring.

## RM administrative-burden test

| Test | Result in this slice |
| --- | --- |
| Manual fields | Reference and initial status removed; optional domain fields deferred. |
| Duplicate entry | Client, Staff, Evidence and authenticated context are reused. |
| Auto-filled values | Organisation, user, timestamp, date, owner and single authorised location. |
| Searchable relationships | Client/Staff controlled lookup retained; Evidence search/check introduced. |
| Screens | Capture remains one screen with progressive sections, followed by the governed source record. |
| Context preservation | Existing server routes, relationships and audit history are unchanged. |
| Closure readiness | Outstanding assurance reasons are surfaced before domain workflow controls. |

## Governance regression results

The final local release gate passed. The implementation intentionally changes presentation and query composition only:

- no Prisma schema or migration changes;
- no API mutation changes;
- no permission changes;
- no Action/Evidence lifecycle changes;
- no effectiveness changes;
- no assurance, closure, reopening or history changes.

- Prisma validation: passed.
- TypeScript: passed.
- ESLint: passed.
- Automated tests: **357/357 passed** across **74/74 files**.
- Fresh database: **0 → 63 migrations passed**.
- Committed-baseline upgrade: **60 → 63 migrations passed**.
- Seeded legacy governance-data upgrade: passed.
- Combined signed-in desktop release gate: **9/9 passed**.
- Combined signed-in mobile release gate: **5/5 passed**.
- Safeguarding UX correction/visual gate: **2/2 desktop and 1/1 mobile passed**.
- 5,000-record Evidence/Complaint/Safeguarding performance probes: passed.
- Next.js production build: passed.
- Sites/Vinext production compatibility build: passed.

The first Evidence/Oversight combined run exposed strict-locator ambiguities because the new governed timeline and the canonical section correctly displayed the same Action/reopening facts. Tests were narrowed to the intended semantic link or visible occurrence without changing governance behaviour. The final complete run passed 9/9 desktop and 5/5 mobile.

## Visual verification

Production-mode local screenshots were captured from fictional seeded data and inspected at desktop and mobile viewports:

- Command Centre: clear five-second hierarchy; immediate/overdue/assurance/upcoming groups read before supporting counts.
- Safeguarding worklist: compact rows remain scan-friendly and keep stage, attention reason, owner, scope and supporting records together.
- Safeguarding capture: the visible task contains only required-now information, known context, safe defaults and optional Evidence; later detail remains collapsed.
- Safeguarding detail: header and attention status are clear before the domain workflow; canonical Action, chronology and assurance controls remain visible.
- Mobile detail: no horizontal overflow or clipped assurance controls. The existing full governed workflow is vertically long, which remains a later progressive-disclosure opportunity rather than a reason to remove governance content.

Screenshots were written to a temporary local test directory and are not part of the repository or release artefact.

## Remaining frontend debt

1. Server-backed governed-source typeahead after the typed relationship architecture is agreed.
2. Extend the governed management timeline to remaining high-value domains only where canonical events are reliable; retain immutable technical audit history.
3. Client and Staff profile experience, including photo handling, without weakening directory security.
4. Global quick find across authorised governance records; deliberately not started in this slice.
5. Production-like large-tenant Action and Management Oversight baselines plus operational monitoring.
6. Evidence file preview/download UX with explicit authorisation and safe content handling; metadata preview is complete.
7. Controlled design-system consolidation after the proven assurance, Evidence and oversight patterns are stable.

## Product judgement and pushback

- Not every table should be removed. Risks, workforce and audit comparison are materially easier in aligned columns.
- Client/Staff selection should not become free-text autocomplete that silently creates identities. An unmatched value remains unlinked.
- The frontend must not infer assurance, closure, safeguarding outcome or risk reduction.
- A broad relationship drawer should not be simulated with loose IDs. It should follow the planned governed relationship architecture.
- The Command Centre and Management Oversight should remain separate: one answers “what requires attention today?”, the other supports deeper accountability and delegation oversight.

## Next recommended frontend slice

The next frontend slice should address **Client and Staff profile usability**—including controlled photo presentation and faster navigation from governed records—without introducing free-text identities or weakening directory, tenant or location security. Global quick find should remain separate until the typed governance-relationship architecture is ready.
