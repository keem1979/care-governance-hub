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
- `AIInteractionLog` records authorised sources, response class and feedback without unnecessary sensitive text.

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
# Phase 7 governance-control extension

- `GovernanceDecision` is a one-to-one controlled record for a `MeetingAgendaItem` decision from an approved `GovernanceMeeting`. It retains the exact source wording, accountable owner, impact, optional linked action/external party, implementation evidence and independent review.
- `GovernanceObligation` tracks a commissioner, regulator, contract or information-return commitment without replacing its canonical KPI return, action, calendar item or decision. Its source fields deep-link to that canonical record.
- `GovernanceObligationUpdate` is an append-only chronology for notes, chases, submissions, queries, responses, acceptance, closure and escalation.
- `ExternalParty` is the canonical organisation/agency contact reused by obligations and external action dependencies. Duplicate free-text party creation is not a supported Phase 7 path.
- High/critical decision implementation is gated by current verified evidence. Independent review must be performed by a user other than the owner and implementer.

# Phase 8 connected-governance extension

- `IntegrationConnection` is the approved operating boundary for one supplier or system connection. It retains direction, data classification, owner, review date, eight assurance gates and visible health.
- `IntegrationCredential` retains a token hash and display prefix only. The clear token is returned once at issue and is never stored by QCGMS.
- `IntegrationEvent` is idempotent within its connection and retains the source event ID, operation, payload checksum and processing outcome. Unknown identities are quarantined through `ReconciliationCase`; a received event never silently mutates a canonical record.
- `ImportBatch` and `ImportRow` retain file checksum, source, analysis counts and row-level decisions. Only `READY_TO_CREATE` rows can create a canonical record; `EXACT_MATCH` links without update and `POTENTIAL_MATCH` remains blocked for human reconciliation.
- `SourceAuthority` records one approved source decision per organisation and canonical entity type, including authority level, governed fields, rationale and review date.
- `OfflineCapture` receives a note only after device-local AES-GCM decryption by the submitting user. It remains pending or conflicted until a manager accepts or rejects it; acceptance creates unverified evidence and never edits the linked source.
- `ExternalIdentifier.connectionId` ties a source identity to its controlled connection while preserving the organisation-scoped uniqueness rules.

# Phase 9 trustworthy-Abi extension

- `AIInteractionLog` is the tenant-scoped audit record for one Abi question and answer. It stores a cryptographic query hash, redacted question summary, answer text and hash, response class, confidence and current module path.
- `AIInteractionSource` records every controlled internal or official regulator source shown with the exact answer, including authority, source URL and checked date where relevant.
- `AssistantFeedback` links helpful, not-helpful or unsafe feedback to the exact interaction and user. Feedback comments are redacted before storage.
- `AssistantEscalation` is created automatically for uncertain and prohibited questions. It retains a controlled reference, priority, redacted question, raised-by and assigned management identities, decision response and chronology.
- Raw questions are not persisted. The redaction layer removes email addresses, phone numbers, governed record references, UUIDs and long identifiers before the management audit record is written.

# Phase 10 configurable-delivery extension

- `TenantConfigurationVersion` is an immutable numbered configuration snapshot once submitted. Draft withdrawal is retained as rejected history rather than deleted.
- `ConfigurationPromotion` separates the person requesting a live change from the authorised manager reviewing it and preserves the captured readiness evidence.
- Safety settings are a validated part of every configuration snapshot. Tenant isolation, evidence-backed high-risk closure, independent verification, human promotion approval and Abi uncertainty escalation cannot be disabled.
- `ImplementationPlan` and `ImplementationChecklistItem` retain accountable ownership, target date, status, completion evidence and go-live chronology.
- `NotificationPreference` belongs to one organisation membership. Critical-safety notifications remain enabled and immediate regardless of saved input.
- `ProductAdoptionEvent` contains only tenant-scoped workflow metadata: module, allow-listed event name, outcome, optional duration and attributable user. It must never contain form narrative, care content, document text or unnecessary personal data.

# Phase 11 validated-launch extension

- `LaunchPilot` records one bounded internal DBAM or external-provider evaluation with a named operational outcome, success criteria, risk controls, authorised data scope, dates and accountable owner.
- `LaunchOutcomeMeasure` retains one governed metric definition per pilot, its matched baseline and follow-up, sample size, method, evidence reference and independent verification. A recorded value is not launch evidence until a different authorised manager verifies it.
- `ServiceReadinessItem` is the evidence-bearing commercial operating register for support, security assurance, data protection, incident and continuity operations, onboarding and offboarding, and service levels.
- `CommercialIntentRecord` belongs only to an external-provider pilot. Discovery and pilot-only statuses do not count as paying intent; budget confirmation, contract review or ready-to-buy status must retain a meaningful evidence note.
- `BenchmarkConsent` records an organisation's explicitly scoped, independently reviewed and withdrawable permission for possible future aggregate measures. Aggregation-only processing, direct-identifier exclusion, free-text exclusion and a cohort of at least ten organisations are mandatory defaults.
- Phase 11 does not implement cross-tenant benchmark output. Tenant data remains isolated, and missing pilot or outcome evidence is displayed as incomplete rather than inferred.
