# Canonical Data Model

This is the controlling conceptual model for new work. Phase 2 introduces the
first reviewed canonical identity, reconciliation and material-change models;
later concepts remain planned until their release phase is implemented.

## Universal governance fields

Every governed business record carries, where applicable:

- UUID primary key, `organisationId` and `locationId`.
- Human-readable reference that is unique within its intended scope.
- Status, owner, created/updated timestamps and archive state.
- Source system and external identifiers.
- Version or immutable history for controlled content.
- Relationships to evidence, activity and authorised people.

The browser never supplies trusted tenant authority. UTC is used for storage and
dates are presented in the user's appropriate UK context.

## Canonical identity

| Entity | Owns | Must not be duplicated by |
| --- | --- | --- |
| `Organisation` | Tenant identity, settings and selected frameworks | Reports, integration or location modules |
| `ServiceLocation` | Registered or operating service identity | Registers, KPIs or workforce modules |
| `Person` | Internal client reference, identity and relationships | Care plans, incidents or assessments |
| `StaffMember` | Workforce identity and employment context | Training, findings or meeting records |
| `ExternalParty` | Commissioner, authority, professional or supplier identity | Individual actions or free-text contact copies |
| `User` | Sign-in identity | Staff profile; the two may be linked but remain distinct concepts |

Potential duplicates create a `ReconciliationCase`. Automatic merging of
ambiguous people or staff is prohibited.

## Authority and configuration

- `OrganisationMembership`, `Role`, `Permission` and location assignments control access.
- `ManagementDelegation` records time-limited accountability, scope and audit history without granting permissions.
- `ConfigurationVersion` preserves approved risk matrices, deadlines, terminology and workflows.
- `Framework`, `FrameworkVersion` and `FrameworkRequirement` hold jurisdiction-specific content.

## Care and workforce governance

- `CarePlan` has controlled `CarePlanVersion` records and one published current version.
- `CarePlanReview` proposes changes; it does not overwrite the current plan directly.
- `MaterialChange` records classification, rationale, approval and affected relationships.
- `DependencyReview` records each linked item that was applied, dismissed or remains open.
- `AcknowledgementRequirement` and `UnderstandingCheck` record who must read or demonstrate understanding.
- `StaffComplianceRecord` and `Competency` are the authoritative workforce assurance records.
- `CareCompetencyRequirement` connects a care requirement to current verified competence without becoming a roster.

## Continuous assurance

- `Finding` is the normalised issue raised from any source module.
- `Risk` records exposure, controls and review history.
- `Action` records ownership, due date, priority, success measure and lifecycle.
- `ActionEvidence` links governed evidence without duplicating it.
- `Verification` records independent review and rationale.
- `EffectivenessReview` compares the predefined success measure with observed outcome.
- `RecurrenceCase` groups related repeat findings.
- `RootCauseReview` records structured causes and optional Five Whys steps.
- `ImprovementPlan` groups related findings, objectives, measures, milestones and outcomes.
- `ExternalDependency` records the party, request, chasing, interim control and ageing.

## Evidence and controlled content

- `EvidenceItem` owns title, provenance, source, author, date, validity and confidentiality.
- `EvidenceVersion` owns each file or controlled representation and checksum.
- `EvidenceVerification` records relevance, currency and reviewer outcome.
- `Policy` and `Template` own their versions, approvals and change history.
- `PolicyWorkflowMapping` and `RequirementEvidenceMapping` are explicit relationships.

## Management and reporting

- `GovernanceMeeting` owns agenda, approved minutes and linked decisions.
- `Decision` records rationale, evidence, accepted risk and review date.
- `CalendarObligation` is the central due-date projection linked to its source record.
- `KPIEntry` holds a defined measure, source, period and calculation version.
- Dashboards, quick guides and reports are generated projections with source links.
- `ManagementSavedView` stores each user's authorised command filters; it does not copy source records.
- `ManagementDelegation` records temporary responsibility between active tenant memberships and never expands access.

## Integration and audit

- `ExternalIdentifier` connects a canonical record to an approved source system.
- `ImportBatch` and `IntegrationEvent` retain source, counts, outcome and failures.
- `ReconciliationCase` requires human resolution for conflicts or duplicate identity.
- `ActivityLog` is append-only for ordinary users and records material actions.
- `AIInteractionLog` is planned to record authorised sources, response class and feedback without unnecessary sensitive text.

## Deletion and history

Governed records use archive, merge, supersede or entered-in-error states rather
than routine hard deletion. Permanent deletion or anonymisation requires an
authorised retention decision while preserving legally required audit evidence.

## Implementation status

The repository implements foundation, workforce, care-plan, register, risk,
action, evidence and reporting models. Phase 2 implements `ExternalParty`,
`ExternalIdentifier`, `ReconciliationCase`, `MaterialChange` and
`DependencyReview`. Phase 3 implements `Finding`, `RootCauseReview`,
`Verification`, `EffectivenessReview`, `RecurrenceCase`, `ImprovementPlan` and
`ExternalDependency`. Remaining conceptual models are not live until their
later roadmap phases pass their release gates. Phase 4 implements
`ManagementSavedView` and `ManagementDelegation`, with owner, registered-manager,
location and personal projections over canonical governance records. Phase 5
implements version-scoped `CarePlanStaffAssignment`,
`AcknowledgementRequirement`, `UnderstandingCheck` and
`CareCompetencyRequirement`, plus an explicit one-to-one link between a login
and its tenant workforce profile.
# Phase 6 evidence assurance additions

Evidence provenance is held on `Evidence`; immutable reviewer decisions are held
in `EvidenceVerification` and may point to the exact `EvidenceVersion` reviewed.
`ComplianceRequirementEvidence` now records suitability, rationale, categories
and reviewer metadata. `PolicyRequirementMapping` and
`TemplateRequirementMapping` distinguish content coverage from evidence of
implementation.

`RegulatoryFrameworkVersion` and `FrameworkChangeReview` record the external
source and the organisation's owned impact work. `MockInspection` and
`MockInspectionSample` retain the sampling plan and conclusions from documentary,
observational and experiential checks. All organisation and location relations
remain explicitly scoped; no evidence or decision is shared between tenants.
