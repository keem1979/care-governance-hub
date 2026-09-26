# WP-002 — Zero-Friction Evidence Upload and Reuse

## Production reference
Version 120 — `124474c`.

## Problem
Routine RM Evidence capture still falls back to the standalone Evidence administration form. That form is appropriate for library administration but is too heavy for the common task “I need to attach this document to the record I am already working on”.

The standalone new-Evidence form exposes title, description, source/provenance fields, taxonomy, provider subtype, currentness, owner, location, dates, confidentiality, tags and notes around the file input. In a governed context, QCGMS already knows much of the administrative context.

## User-visible improvement
New Evidence: **Add Evidence → Upload file/photo → Done**

Existing Evidence: **Add Evidence → Use existing → Search → Preview → Link**

## Scope
Incident, Complaint and Safeguarding detail; Action detail/assurance; Action completion; verification; effectiveness; existing Evidence reuse; mobile Evidence interaction.

Risk and Audit may reuse the pattern only where the existing architecture cleanly supports it. Wider redesign is out of scope.

## Protected invariants
- one canonical Evidence model
- one canonical Action lifecycle
- authenticated uploader and timestamps
- tenant/location/permission enforcement on the server
- source relationship and Evidence-role history
- closed-record protection
- human verification, effectiveness, Management Assurance and closure decisions

## Existing capability reused
- `Evidence`, `EvidenceVersion`, `EvidenceVerification`
- private file storage, checksum and versioning
- `titleFromFileName()`, `validateEvidenceFile()`, `evidenceScopeWhere()`
- `RegisterEntryEvidence`
- `ActionEvidence` and `linkActionEvidence()`
- `/api/evidence/authorised-options`
- Action Evidence drawer and metadata preview
- `AuthorisedAsyncMultiSelect`
- `syncRegisterEvidence()`, `syncActionEvidence()`, `syncRiskEvidence()`, `syncAuditEvidence()`

## Architecture decision
No ADR or schema migration is required if WP-002 extends the existing Evidence model and relationship services.

A contextual upload path must resolve the source record server-side. The browser may submit only the source kind/id, file(s), and a fixed Evidence relationship purpose when the launching action makes that purpose explicit. Tenant, organisation, user and location are server-owned context.

## Gate A
**PASS** subject to `docs/ux/WP-002_ZERO_FRICTION_EVIDENCE.md`.

Fail the design if metadata is required before choosing a file, users must leave the current record, a second Evidence model is introduced, or the interface infers professional decisions from Evidence.
