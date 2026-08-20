# QCGMS feature consolidation audit

## Decision

QCGMS had too many first-level menu entries. Some were canonical record-owning
modules, while others were assurance views over the same records. Presenting
both as equal features made the product feel repetitive and increased the time
needed to find routine work.

The safe remedy is to remove duplicate navigation, not governed data. Canonical
records, provenance, permissions and bookmarked routes remain intact. Routine
work is visible by default; advanced verification and implementation tools are
available through their parent module, navigation search or the optional
Specialist tools section.

## Consolidated product map

| Existing surface | Decision | Canonical home or access path |
| --- | --- | --- |
| Dashboard | Keep as the organisation attention summary | Workspace |
| My Work | Keep as the signed-in user's personal delivery list | Workspace |
| Management Command | Keep as owner, RM and location oversight | Workspace |
| Client Directory | Keep; owns controlled person profiles | People & Care |
| Care Plans | Keep; owns controlled care-plan versions | People & Care |
| Care Assurance | Merge under Care Plans as the staff-assurance view | Care Plans related views / Specialist tools |
| Assessment Centre | Keep; it is a guided assessment experience using the register engine, not a second record | People & Care |
| Workforce Compliance | Keep; owns staff compliance records | People & Care |
| Quality & Outcomes | Keep as an RM roll-up; it creates no duplicate records | Oversight & Reporting |
| Policies | Keep; owns controlled policy records | Governance & Assurance |
| Evidence Library | Rename to Evidence & Assurance | Governance & Assurance |
| Evidence Assurance | Merge under Evidence & Assurance as verification, mapping and mock-inspection work | Evidence related views / Specialist tools |
| Audit Centre | Keep; owns structured audit instances and responses | Governance & Assurance |
| Registers | Keep; owns operational event and decision records | Governance & Assurance |
| Risk Register | Keep; owns scored risks and reviews | Governance & Assurance |
| Action Tracker | Rename to Actions & Improvement | Governance & Assurance |
| Improvement Assurance | Merge under Actions & Improvement as verification and effectiveness work | Actions related views / Specialist tools |
| Governance Meetings | Keep; owns agendas, minutes and decisions | Governance & Assurance |
| Governance Control | Merge under Management Command and Meetings as decisions and external obligations | Related views / Specialist tools |
| Compliance Calendar | Keep; one deadline view over source records | Oversight & Reporting |
| KPI Suite | Keep; owns measured management results | Oversight & Reporting |
| Inspection Centre | Keep; owns RM assurance judgements and evidence mapping | Oversight & Reporting |
| Reports | Keep; read-only outputs from canonical records | Oversight & Reporting |
| Template Library | Move below Evidence & Assurance; it is a supporting resource, not routine work | Evidence related views / Specialist tools |
| Activity Log | Move below Reports and Settings; it is an audit trail, not a work module | Reports related views / Specialist tools |
| Connected Governance | Rename to Connections & Data | Setup & Data |
| Data Quality | Merge under Connections & Data as the reconciliation and dependency-review queue | Connections related views / Specialist tools |
| Security & Integration Assurance | Merge under Connections & Data as the approval-gate view | Connections related views / Specialist tools |
| Abi Assurance | Move to specialist review and escalation | Navigation search / Specialist tools |
| My Security | Move to the signed-in account area | Sidebar account area / Specialist tools |
| Implementation Centre | Move below Organisation Settings | Settings related views / Specialist tools |
| Launch Assurance | Move below Implementation; it is pilot and product-launch evidence, not daily care governance | Implementation related views / Specialist tools |

## Removed or already consolidated

- Credit control is absent from the application and remains explicitly outside
  the QCGMS product boundary.
- The old Evidence Requirements entry point already redirects to Inspection
  Centre framework coverage.
- Reused data in Dashboard, Quality Overview, Calendar, Reports and Management
  Command is read-only aggregation. These are not second sources of truth.

## Result

- The default sidebar is reduced to eighteen routine destinations plus three
  role-specific workspace destinations.
- Specialist tools stay hidden until requested, searched for or currently open.
- Paired functions now use one product name: Evidence & Assurance, Actions &
  Improvement, and Connections & Data.
- No customer records, history, permissions or evidence links are deleted.
