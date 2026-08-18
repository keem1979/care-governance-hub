# Architecture

## Product architecture

QCGMS is a multi-tenant continuous assurance platform. Its business architecture
is separated into four layers:

```text
Experience: RM, provider-owner, location, staff and auditor views
Governance: findings, risks, actions, evidence, decisions and outcomes
Canonical records: people, staff, organisations, locations and governed objects
Platform trust: identity, permissions, tenancy, audit, storage and integration
```

Regulatory frameworks sit beside the governance layer as versioned
configuration. They map requirements to evidence and assurance tests without
changing the canonical records or hard-coding one regulator into the platform.

## Request and authority flow

```text
Browser
  -> Next.js proxy (optimistic signed-cookie check)
  -> Server Component or Route Handler
  -> Auth data-access layer (database session + active membership)
  -> Permission and location guard
  -> Tenant-scoped domain operation
  -> PostgreSQL and private object storage
```

The proxy is not the security boundary. The server verifies the live session,
membership, permissions, organisation and location scope for protected data.

## Architecture decisions

### ADR-001: QCGMS is a governance layer

The product complements operational care, eMAR, rostering, HR and finance
systems. It owns governance relationships and assurance outcomes rather than
reimplementing those operational platforms.

### ADR-002: Canonical identity before synchronisation

Person, staff, organisation and location records have stable QCGMS identities
and may carry multiple external identifiers. Imports create reconciliation work
when identity is ambiguous; they do not silently create or merge governed people.

### ADR-003: One universal assurance chain

Audits, registers, risks, care reviews, workforce controls and meetings may
raise findings, but actions use one lifecycle for ownership, evidence,
verification, effectiveness and recurrence.

### ADR-004: Dependency review is advisory

A material change creates an impact list. It may not silently alter a care plan,
risk, competency or policy. An authorised person reviews, applies or dismisses
each dependency with a reason.

### ADR-005: Regulatory content is versioned configuration

England, Scotland, Wales, Northern Ireland, commissioner and tenant frameworks
use the structure in `REGULATORY_FRAMEWORKS.md`. Historical assessments retain
the exact framework version used.

### ADR-006: Evidence is a governed object

Evidence has provenance, validity, version and verification. Files and links are
supporting artefacts; their mere existence is not proof that a control worked.

### ADR-007: Generated views are not new sources of truth

Dashboards, quick guides, reports and inspection packs are projections of live
authorised records. They retain source references and generation history but do
not become duplicate operational records.

### ADR-008: Planned controls are labelled honestly

Documentation distinguishes current implementation from approved target design.
Certification, service assurance and external integrations are not claimed until evidenced.

## Domain boundaries

- Identity and tenancy: users, memberships, locations, permissions and delegation.
- People and care assurance: person, assessment, care plan, review and acknowledgement.
- Workforce assurance: staff, checks, training, competency and supervision.
- Operational governance: registers, findings, risk, action and external dependency.
- Controlled content: policy, template, framework and assurance test.
- Evidence and reporting: evidence, provenance, KPI, inspection and report projection.
- Management control: meeting, decision, improvement plan, calendar and notification.
- Integration: source identifiers, import batches, events and reconciliation cases.

Each domain uses shared authority and tenant guards. Cross-domain changes occur
through explicit services and relationships rather than hidden duplication.
