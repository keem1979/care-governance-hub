# Data Model

## Workforce Suite

- `StaffMember` is the single workforce profile, with an automatic staff reference, role/location, private profile-photo storage key and configurable leave allowance.
- `StaffComplianceRecord` stores dated recruitment checks, training, supervision, appraisal and observed competency outcomes. Training records can link to a catalogue course and controlled evidence.
- `TrainingCourse` contains the shared Skills for Care/CQC-informed catalogue plus organisation-specific courses. `StaffTrainingRequirement` assigns only the applicable courses to each worker.
- `StaffLeaveRequest` records annual leave, sickness and other leave, the requested working days, manager decision and return-to-work or fit-note follow-up.
- Staff documents are restricted `Evidence` records linked with `relatedModule = StaffMember`; the live training matrix has one automatically refreshed restricted evidence record.

Workforce access remains tenant- and location-scoped through `workforce:view` and `workforce:manage`. Profile photographs and uploaded documents remain in private object storage and are served only after an authorised request.

## Foundation entities

| Entity | Purpose | Tenant rule |
| --- | --- | --- |
| `Organisation` | Top-level tenant | Root of every business record |
| `ServiceLocation` | Registered or operating service | Belongs to one organisation |
| `User` | Global sign-in identity | Access only through active memberships |
| `OrganisationMembership` | User, organisation, role and status binding | Unique per user and organisation |
| `MembershipLocation` | Explicit location assignment | Links only authorised membership locations |
| `Role` / `Permission` | Central access definitions | System roles; authority comes through membership |
| `RolePermission` | Role-to-permission mapping | Central source for server checks |
| `Session` | Revocable authenticated session | Tied to one user; tenant resolved from membership |
| `ActivityLog` | Append-only security/governance event | Organisation/location keys when known |

UUIDs are used for identifiers and timestamps are stored in UTC. Governance entities
added in later milestones must include an organisation foreign key and, where
relevant, a service-location foreign key. Important structured fields remain
relational for filtering, reporting, and integrity.

## Deletion

Organisations and locations have archive timestamps. Memberships and sessions are
deactivated or revoked. Activity records are never editable by ordinary users.
Later governance records should use `archivedAt` rather than physical deletion.

## Seed scope

Milestone 1 seeds the fictional Meadow View Home Care Ltd organisation,
Basingstoke Branch, the seven default roles, permissions, and one demo user for each
role. Policy, audit, risk, register, and KPI sample data belongs to the milestone
that introduces each corresponding relational model.
