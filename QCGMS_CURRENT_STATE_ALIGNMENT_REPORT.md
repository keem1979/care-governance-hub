# QCGMS Current State & Alignment Report

Date: 21 August 2026
Scope: repository inspection and first Risk Register alignment slice

## 1. Current architecture

QCGMS is an existing multi-tenant Next.js 16 application using React 19,
TypeScript, PostgreSQL and Prisma. Protected requests pass through the
server-side authentication data-access layer, permission checks, organisation
scope and location scope before domain queries run. The application separates:

- canonical records for organisations, locations, people receiving support,
  staff and governed objects;
- governance records for risks, findings, actions, evidence, decisions and
  outcomes;
- generated management views, dashboards and reports;
- platform controls for sessions, permissions, activity history, storage,
  configuration and integrations.

The architecture already states that QCGMS is a governance layer rather than a
replacement for eMAR, rostering, payroll, finance or point-of-care systems.

## 2. What already exists

- Organisation, service/location, membership, role and location-scoped access.
- Central Client and Workforce records, including training, competencies,
  supervision and other workforce compliance records.
- Controlled Policy, Evidence and Care Plan records with versioning in the
  areas where signed/approved history matters.
- Audit templates, audit instances, responses and findings.
- A shared register engine for incidents, complaints, safeguarding and other
  operational records, with client/staff/location links and record history.
- A mature central Action lifecycle with source links, owners, oversight,
  evidence, management response, independent verification, effectiveness,
  recurrence and external dependency handling.
- A Risk model covering cause-event-consequence, inherent/current/target
  scoring, controls, appetite/tolerance, treatment, owner, review, escalation,
  closure and dated review history.
- Evidence provenance, versions, verification decisions, expiry/review dates
  and many-to-many links to governed records.
- Exception-oriented Dashboard, My Work and Management Command projections for
  overdue, high-risk and awaiting-assurance work.
- Governance meetings, decisions, obligations, KPIs, inspection assurance,
  improvement plans, notifications and reports.
- Activity logging with actor, time, record, location and before/after values
  in material workflows.
- Abi interaction audit and management escalation when the assistant cannot
  answer safely. It does not make the regulated decision.

## 3. Partial implementations

- Risk sources had type and reference snapshots, but the form did not offer
  existing QCGMS source records. The first slice now links available
  system-generated Evidence records from source modules and preserves their
  provenance. A fully typed cross-module Risk source relationship remains a
  deeper design decision.
- Risk evidence linking existed, but Risk forms excluded system evidence from
  Registers, Audits and Risks and showed only titles. The selector now includes
  authorised reusable evidence and exposes category, module, reference and
  assurance state.
- Risk controls and treatment existed as free text. Context-sensitive,
  editable control and treatment suggestions now reduce blank-page typing.
  Provider-managed control catalogue records do not yet exist.
- Formal Risk review existed, but evidence checked was free text and the trend
  could not be recorded as insufficient evidence. Reviews can now select linked
  evidence and explicitly retain “Insufficient evidence”.
- Risk review history is strong, but “since last review” did not assemble
  changes. The Risk record now summarises changed evidence, changed actions and
  overdue actions. Other modules appear only when they are linked.
- Evidence is a governed object, but its category/type values remain broad
  strings rather than a configurable, versioned evidence taxonomy.
- Risk appetite and tolerance are stored per Risk. There is no inherited,
  versioned organisation/category framework yet.
- Exception dashboards already exist, but not every module emits the same
  assurance signals or uses the shared assurance terminology.

### Requirement classification

| Requirement | Classification | Decision |
| --- | --- | --- |
| Canonical people, staff, organisation and location | A — already implemented | Preserve directories and foreign-key selectors. |
| Central Follow-Up Actions | A — already implemented | Reuse the existing Action lifecycle; do not add Risk actions. |
| Shared governed Evidence | A/B — strong but taxonomy partial | Reuse Evidence, versions and verification; extend taxonomy later. |
| Risk source linking | B/C — partial and practical now | Link available source-module Evidence now; design typed relationships later. |
| Contextual control library | B/C — partial and practical now | Added reusable contextual prompts; tenant-managed records require deeper design. |
| Smart evidence suggestions | B/C — partial and practical now | Added authorised search, provenance and assurance state; contextual ranking can follow. |
| Assurance gaps/conflicts | C — practical now | Added deterministic prompts only where current data proves the condition. |
| Treatment catalogue | B/C — practical wording; deeper handoff | Added contextual treatment prompts; next slice should pre-populate canonical Actions. |
| Organisational Risk appetite | D — architecturally deeper | Use versioned organisation/category configuration with controlled override. |
| Guided score suggestions | D/E — possible but not safe now | Defer until rules, provenance and validation data exist. |
| Smart Risk review | B/C — partial now | Added linked changes since review; full cross-module chronology needs typed links. |
| Management Assurance Test | C/F — practical with a better design | Added readiness plus reasons, deliberately not a percentage. |
| External scrutiny aid | C — practical now | Added an internal aid with an explicit no-endorsement statement. |
| Apply the model across every module immediately | E — not practical in one safe change | Roll out one module at a time using the shared evaluator and canonical links. |
| Automatic professional decisions | F — better solution required | Surface evidence and conflicts; retain authorised human decision and rationale. |

## 4. Important gaps

- No general, referentially safe relationship service yet connects every
  source and affected record. Some modules use dedicated joins, while Actions
  use validated typed source fields and URLs.
- Risk closure previously allowed closure without independent supporting
  evidence and without checking unresolved linked treatment actions. This first
  slice now blocks both conditions.
- `furtherControls` remains a treatment summary, while accountable delivery
  belongs in central Actions. The product must avoid treating prose in this
  field as a completed action.
- A reusable provider-configurable Control Catalogue and treatment catalogue
  require ownership, versioning, tenant configuration and retirement rules.
- Full smart Risk review needs reliable source relationships and change events
  from incidents, complaints, safeguarding, care plans, workforce and policies.
- Contextual scoring rules do not exist. Any implementation needs a versioned
  rule basis, provenance, validation and an explicit accept/change decision.
- Assurance conflict detection is currently limited to facts the system can
  prove reliably. It does not infer clinical or regulatory conclusions.
- The Evidence taxonomy does not yet express the full care, clinical,
  workforce, professional, equipment, governance and regulatory hierarchy in
  configurable form.

## 5. Duplicate-data risks

- `Risk.sourceType` and `Risk.sourceReference` are useful historical snapshots,
  but users previously had to retype references already held in Registers,
  Audits or Evidence.
- `Risk.furtherControls` can duplicate central Actions if it is treated as an
  action tracker rather than a concise treatment intention.
- `Risk.controlAssurance` and `RiskReview.assuranceChecked` can repeat evidence
  titles instead of linking evidence. The UI now offers linked records but the
  review schema still stores a human-readable snapshot.
- `AuditResponse` retains evidence source reference snapshots as well as an
  optional Evidence link. Snapshot use is legitimate for history, but the live
  Evidence record must remain canonical.
- Dynamic `RegisterEntry.data` can contain person, staff or service wording
  even though canonical IDs also exist. Register schemas should be reviewed so
  names are display snapshots only and selectors use canonical IDs.
- Reports, Dashboard, Calendar, Quality Overview and Management Command repeat
  information visually. This is intentional projection, not duplicate record
  ownership, provided they remain read-only and source-linked.
- Existing feature consolidation correctly removed duplicate navigation rather
  than deleting governed records. Further deletion is not recommended without
  usage evidence and a data-migration plan.

## 6. Recommended architecture

- **Evidence:** retain the existing `Evidence` record, versions,
  verifications and module join tables. Add a versioned taxonomy/configuration
  layer later; do not create Risk evidence records.
- **Actions:** retain the central `Action` lifecycle. Risk treatment selections
  should create or link Actions through the existing validated source service.
  `Risk.furtherControls` should remain a readable management summary only.
- **Controls:** use the new reusable code-level contextual catalogue for the
  immediate UX. Introduce tenant-owned `ControlDefinition` and
  `ControlApplication` records only when customisation/versioning requirements
  are agreed.
- **Assurance:** use the new generic Management Assurance Test evaluator, with
  module-specific factual check builders. Keep outputs as readiness plus
  reasons, not a superficial percentage.
- **Relationships:** standardise a validated governance relationship service
  after deciding whether cross-module links need dedicated foreign-key joins or
  a controlled typed relationship table. Do not add many unvalidated string IDs.
- **History:** retain current domain histories and `ActivityLog` before/after
  records. Approved/signed versions must remain immutable; corrections should
  produce new versions or explicit history events.

## 7. Practical now

- Context-sensitive, editable control and treatment suggestions.
- Search and link authorised existing evidence with visible provenance and
  verification state.
- Use system-generated Evidence records as current source links where those
  records already exist.
- Risk-specific Management Assurance Test built on a reusable evaluator.
- Deterministic potential assurance gaps and conflicts.
- “Since last review” summary for linked evidence and Actions.
- “Unknown / evidence required” and “Insufficient evidence” in professional
  review workflows.
- Stronger Risk closure gates for independent evidence and unresolved Actions.
- Continue auditing high-volume forms for fields that can use current canonical
  selectors and source pre-population.

## 8. Requires deeper architecture

- A typed cross-module relationship graph with migration of existing snapshots.
- Organisation/category Risk appetite with version, effective dates, authorised
  override and rationale.
- Provider-configurable Control and Evidence taxonomies.
- Rules-based scoring suggestions with versioned rationale and safety testing.
- Cross-module “since last review” event aggregation beyond explicitly linked
  records.
- Automatic affected-record prompts after material change, with controlled
  accept/dismiss decisions.
- Full system-wide conversion of legacy JSON/free-text register fields to
  canonical references, including safe historical migration.

## 9. Not recommended

- One universal database table containing every care and governance concept.
- Hundreds of undifferentiated checkboxes or a permanently expanded catalogue.
- Automatically changing the RM's risk score, control effectiveness,
  safeguarding outcome, notification decision or closure decision.
- Treating an uploaded file, sent email, assigned training or management
  response as proof of effectiveness.
- A single assurance percentage that hides which essential requirement failed.
- Deleting apparent duplicate pages where one owns records and the other is a
  legitimate management projection.
- Hard-coding DBAM, one regulator or one provider's risk appetite into product
  logic.

## 10. What was implemented

- Added a reusable contextual governance catalogue for Risk controls and
  treatment suggestions.
- Replaced blank-page Risk control/treatment entry with select-and-edit prompts.
- Added an authorised Risk evidence option service using the existing Evidence
  Library, including system records, provenance and assurance status.
- Added existing-source selection to the Risk form without a new duplicate
  source table.
- Added searchable, provenance-aware Evidence linking to Risk create/edit.
- Added the reusable `managementAssuranceTest` evaluator and a factual Risk
  assurance builder.
- Added Risk assurance-readiness, external-scrutiny aid, potential assurance
  conflict and “since last formal review” views.
- Added linked-evidence shortcuts and “Insufficient evidence” to formal Risk
  review.
- Strengthened Risk closure: independent evidence is required and unresolved
  treatment Actions block closure.

## 11. Files/schema changed

Important files:

- `src/components/risk-form.tsx`
- `src/components/risk-actions.tsx`
- `src/app/(app)/risks/new/page.tsx`
- `src/app/(app)/risks/[id]/edit/page.tsx`
- `src/app/(app)/risks/[id]/page.tsx`
- `src/app/api/risks/[id]/reviews/route.ts`
- `src/app/api/risks/route.ts`
- `src/app/api/risks/[id]/route.ts`
- `src/lib/governance-catalogues.ts`
- `src/lib/risk-evidence-options.ts`
- `src/lib/management-assurance.ts`
- `src/lib/management-assurance.test.ts`
- `src/lib/risks.ts`
- `src/lib/risks.test.ts`

No Prisma schema or database migration was added in this slice. No duplicate
module or canonical entity was created.

## 12. Testing

- TypeScript type check: passed.
- ESLint: passed.
- Targeted Risk, Evidence, closure-loop and Management Assurance tests: 29
  passed.
- Full repository check passed: Prisma schema validation, TypeScript, ESLint and
  300 unit/integration tests across 64 files.
- Production `vinext` build passed and generated the complete route manifest.
- Playwright public/login/security checks passed. Signed-in scenarios could not
  run because the configured demo account's stored MFA secret no longer matches
  the fixed E2E fixture; repeated attempts then correctly triggered rate
  limiting. This is test-data/environment drift, not a failure in the Risk
  change, but authorised browser validation remains outstanding.
- Primary regression concerns are large evidence collections, historical Risks
  with sparse fields and the governed transition from Risk review to closure.

## 13. Recommended next phase

Build the Risk-to-Action handoff first. A selected treatment should open the
existing central Action workflow with the Risk, location, proposed wording and
expected evidence pre-populated. After that, add versioned organisation/category
Risk appetite using the existing controlled configuration architecture. This
order produces immediate RM time savings while protecting the single Action
source of truth.

# Questions / Decisions for Governance Alignment

## Organisation risk appetite

**Current behaviour:** Appetite and tolerance are recorded on every Risk.
**Technical constraint:** Central inheritance needs versioning, effective dates,
category mapping and authorised override history.
**Governance consequence:** Repeated per-Risk entry can be inconsistent, but a
poor central default could also misstate tolerance across service types.
**Recommendation:** approve a versioned organisation/category framework with a
mandatory rationale for authorised override; do not hard-code default scores.

## Risk closure authority

**Current behaviour:** High/Critical closure requires a named approver and date;
all Risk closure now requires sufficient appropriate evidence and no unresolved
linked Actions. High/Critical closure additionally requires current verified
evidence and separation from the Risk owner. A formal review may recommend
closure but does not silently close.
**Technical constraint:** The current Risk model does not define a role-specific
closure authority matrix.
**Governance consequence:** A named active member may not always hold sufficient
authority for the risk category.
**Recommendation:** agree the authority matrix by residual level/category before
adding role-enforced closure approval.

## Control catalogue ownership

**Current behaviour:** QCGMS now offers maintained contextual wording; the RM
confirms and edits what genuinely operates.
**Technical constraint:** Provider-specific controls need tenant ownership,
approval, version and retirement rules.
**Governance consequence:** Treating generic suggested wording as an operating
control would create false assurance.
**Recommendation:** keep current suggestions advisory, then pilot a governed
provider catalogue with DBAM and at least one external provider before schema
commitment.

## Evidence taxonomy

**Current behaviour:** Evidence has category/type strings, provenance, versions,
verification and module relationships.
**Technical constraint:** A richer hierarchy affects forms, filters, reporting,
legacy values and migrations.
**Governance consequence:** An ungoverned list will drift, while an over-detailed
list increases RM administration.
**Recommendation:** agree a compact core taxonomy plus provider extensions and
map existing values before migrating.

## Guided scoring

**Current behaviour:** QCGMS calculates the matrix result from RM-selected
likelihood and impact; it does not suggest professional scores.
**Technical constraint:** Contextual recommendations need explainable,
versioned, tested rules and reliable structured facts.
**Governance consequence:** Premature suggestions may anchor or distort
professional judgement.
**Recommendation:** defer automated suggestions; first capture a small set of
validated risk scenarios and require explicit Accept/Change plus rationale in a
future pilot.
