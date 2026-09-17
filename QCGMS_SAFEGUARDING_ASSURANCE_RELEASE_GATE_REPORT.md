# QCGMS Safeguarding Assurance Release-Gate Report

**Assessment date:** 17 September 2026
**Branch:** `phase-11-validated-launch`
**Baseline commit:** `e1d0b5e`
**Release decision:** **PASS — local release candidate**

The Safeguarding Assurance upgrade has passed the local release gate. It is not yet committed, pushed, migrated in production or published. No production data was changed during this assessment.

## 1. Existing functionality reused

- `RegisterEntry` remains the canonical safeguarding record and source of the original concern facts.
- The existing organisation, service/location, user, client and permission models remain authoritative.
- The central `Action` lifecycle is used for safeguarding follow-up work; no safeguarding-specific action lifecycle was created.
- The governed Evidence Library remains the evidence source.
- Existing Risk, Incident, Complaint, notification, calendar, reporting, dashboard and audit-history infrastructure is reused.
- Existing register permissions and `registerScopeWhere` tenant/location scoping protect all safeguarding routes.
- Existing branded document and organisation-branding mechanisms are reused for the printable safeguarding report.

## 2. Existing functionality upgraded

- Safeguarding register records now have a management-first assurance view above the generic register details.
- Initial safeguarding capture is shorter and progressively discloses the full case workflow after the immediate concern has been recorded.
- Existing register closure is blocked for safeguarding cases; closure and reopening now pass through the safeguarding assurance workflow.
- The generic edit screen no longer presents duplicate safeguarding workflow fields.
- Dashboard, My Work, calendar, KPI and report projections now surface safeguarding exceptions and deadlines.
- Actions created from safeguarding are pre-populated from the canonical case while remaining editable before creation.
- Linked Incident and Complaint sources can be selected rather than having their narratives retyped.

## 3. New functionality built

- Typed one-to-one `SafeguardingCase` extension for current safety, referral and case-stage information.
- Append-only `SafeguardingEvent` chronology.
- Append-only `SafeguardingAssuranceReview` and governed evidence links.
- Progressive case management for immediate safety, referral, external response, investigation, outcome and management assurance.
- Formal readiness assessment showing satisfied conditions and outstanding assurance requirements without a misleading percentage score.
- Proportionate closure controls, separation-of-duties checks and an authorised reopen workflow.
- Central Action handoff with safeguarding source reference and backlink.
- One-click premium branded printable safeguarding assurance report.
- Safeguarding-specific desktop, RM-burden and mobile end-to-end release gates.

## 4. Features deliberately not built

- No separate triage, referral or investigation mini-registers.
- No duplicate action, evidence, risk, notification, calendar or document repository.
- No automatic Local Authority, commissioner, police or CQC submission.
- No AI decision on whether abuse occurred, whether a referral is required or whether a case may close.
- No automatic closure when actions are completed.
- No automatic risk reduction or closure of an originating Incident, Complaint or other linked record.
- No hard-coded statutory response times presented as universal legal rules.
- No superficial assurance percentage.

## 5. Architectural pushback

The requested governance depth is implemented without reproducing paper forms or creating multiple sources of truth.

- **One canonical record:** the original concern remains in `RegisterEntry`; the typed case stores safeguarding workflow state only.
- **One action lifecycle:** treatment work is created in central `Action` and linked back to safeguarding.
- **Independent lifecycles:** closing safeguarding does not silently close an Incident, Complaint, Risk or Action.
- **Chronology rather than overwrites:** material case developments are append-only events, preserving who recorded what and when.
- **Readiness, not scoring:** management assurance returns reasons and blockers. A high pass percentage cannot conceal a critical missing referral or safety action.
- **Human decision retained:** QCGMS organises evidence and highlights gaps; an authorised professional makes the safeguarding and closure decisions.

## 6. RM time-saving and UX improvements

- Initial capture is capped at five essential inputs: event date, concern title, short summary, client and current safety position.
- Where the user has one authorised location, it is selected automatically; the signed-in user is used as the initial owner.
- Detailed case fields are completed progressively after immediate capture instead of blocking the first report.
- Originating Incident or Complaint records are linked by selection, avoiding repeated narrative entry.
- Action creation is pre-filled with source, scope, wording, owner suggestion, priority context, expected outcome and closure-evidence expectation.
- The case page presents current safety, referral position, stage, actions and assurance before generic metadata.
- Chronology is generated from recorded events rather than requiring a separate timeline document.
- Provider-set deadlines automatically appear in My Work and the governance calendar.
- A single branded print action produces the management assurance document.
- Duplicate safeguarding workflow fields are hidden from the generic edit route.

## 7. Migration

Migration added:

`prisma/migrations/20260828170000_safeguarding_assurance_closed_loop/migration.sql`

The migration:

- adds safeguarding status, safety, referral, event and assurance enums;
- adds `SafeguardingCase`, `SafeguardingEvent`, `SafeguardingAssuranceReview` and `SafeguardingAssuranceReviewEvidence`;
- adds scoped foreign keys and indexes for organisation, location, owner, source records and evidence;
- maps legacy safeguarding register entries deterministically without replacing canonical register facts;
- updates the safeguarding form definition to the reduced initial-capture fields;
- preserves existing IDs and historical register data.

Validation results:

- Fresh database: **63/63 migrations passed**.
- Upgrade database: immediately preceding schema upgraded successfully.
- Legacy Incident, Complaint and Safeguarding fixtures remained valid after their deferred migrations.
- Prisma schema validation passed.

## 8. Automated tests

- TypeScript: **PASS** using a 6 GB Node heap.
- ESLint: **PASS**.
- Unit/integration suite: **PASS — 74 files, 357 tests**.
- Safeguarding domain unit tests: **5 passed**.
- Safeguarding Action handoff test: **passed**.
- Database seed: **PASS** with fictional multi-role demo data.
- Diff whitespace check: **PASS**; only Windows line-ending notices were reported.

## 9. Desktop E2E

Focused safeguarding gate:

- Complete Safeguarding lifecycle: **PASS**.
- RM burden/short intake journey: **PASS**.
- Source linking, scoped Action creation and backlink: **PASS**.
- Action completion not treated as automatic safeguarding closure: **PASS**.
- Inappropriate closure blocked with reasons: **PASS**.
- Authorised closure after requirements: **PASS**.
- Closed record protected from workflow mutation: **PASS**.
- Reopen workflow and history: **PASS**.
- Cross-tenant and out-of-location access: **404 as designed**.

Final full desktop regression gate: **9 tests passed in 7.2 minutes with no retries**:

- Action Assurance: 3
- Audit Assurance: 2
- Complaints Assurance: 1
- Incident Assurance: 1
- Safeguarding Assurance: 1
- Safeguarding RM burden: 1

An earlier run exposed two defects: closed-record validation happened before the lifecycle guard, and one test expected the internal `REOPENED` enum rather than the premium label `Reopened`. Both were corrected and the full regression gate then passed without retries.

## 10. Mobile E2E

Final mobile regression gate: **5 tests passed in 1.5 minutes**:

- Action Assurance
- Audit Assurance
- Complaints Assurance
- Incident Assurance
- Safeguarding Assurance

The safeguarding case controls, chronology, actions, assurance panel and management report entry point remained usable at the tested mobile viewport.

## 11. Security

- Every case, event, assurance, source and evidence lookup is constrained by organisation and permitted location.
- Out-of-scope records return 404 rather than revealing whether another tenant's record exists.
- Role permissions govern case updates, action creation, assurance decisions, closure and reopening.
- Separation-of-duties rules prevent inappropriate self-verification where the assurance rule requires another authorised reviewer.
- Closed safeguarding cases are immutable through ordinary case-update routes and must use the audited reopen workflow.
- Assurance reviews and chronology entries are append-only.
- Linked source IDs are validated as real, in-scope typed records before association.
- Test-only E2E setup remains unavailable in production configuration.
- No production authentication controls were weakened for browser testing.

## 12. Performance

The local PostgreSQL 5,000-record release-gate probes passed:

- Safeguarding overdue external-response query: approximately **1.744 ms**.
- Complaint overdue query: approximately **2.754 ms**.
- Complaint recurrence grouping: approximately **0.110 ms**.
- Evidence 5,000-record search: approximately **5.297 ms**.
- Evidence listing: approximately **5.814 ms**.

These are deterministic local release-gate measurements, not a production concurrency or capacity benchmark.

## 13. Builds

- Production-mode Next.js build: **PASS**.
- 144 static pages generated.
- All Safeguarding pages and API routes compiled.
- Full regression E2E reused the successful production build and passed.
- Temporary `.next-release-gate-*` outputs are excluded from source type-checking.
- The release runner snapshots and restores `tsconfig.json`, preventing Next.js custom-build includes from polluting source configuration.

## 14. Known limitations

- External referrals and notifications are recorded and governed, but QCGMS does not transmit them to Local Authority, CQC, police, commissioner or clinical systems.
- The system does not make a safeguarding determination or professional closure decision.
- Provider-specific closure authority and segregation rules may require a later configurable authority matrix beyond the current permission roles.
- Calendar projection requires an explicit provider-set deadline; QCGMS does not invent statutory deadlines.
- Linked source relationships cover the current typed Incident and Complaint use cases; the wider cross-module governance relationship architecture remains a separate design decision.
- Performance results do not replace production observability, concurrency testing or capacity planning.

## 15. Production deployment status

**Not deployed.**

- The release candidate is present only in the local working tree.
- It is currently uncommitted and unpublished.
- Production migrations have not been run for this release candidate.
- Production data and the current live release were not changed by this work.
- A production release should only follow an explicit commit/push/publish instruction and the normal migration/deployment verification process.

## 16. Release recommendation

The Safeguarding Assurance slice is suitable to proceed to controlled commit and deployment when authorised. The production release should apply migrations in order, verify the live schema, exercise signed-in safeguarding creation and closure boundaries, confirm the production-only E2E endpoint remains unavailable, and inspect runtime logs before declaring the release live.
