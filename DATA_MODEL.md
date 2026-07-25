# Data Model

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
