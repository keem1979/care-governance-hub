# UK Regulatory Framework Architecture

QCGMS uses one jurisdiction-neutral assurance engine. Regulatory content is a
versioned configuration layer reviewed by qualified people; it is not embedded
as permanent CQC-specific application logic.

## Initial framework families

| Jurisdiction | Regulator | Framework key |
| --- | --- | --- |
| England | Care Quality Commission | `GB-ENG-CQC` |
| Scotland | Care Inspectorate | `GB-SCT-CIS` |
| Wales | Care Inspectorate Wales | `GB-WLS-CIW` |
| Northern Ireland | Regulation and Quality Improvement Authority | `GB-NIR-RQIA` |
| Local or commissioned services | Local authority or commissioner | Customer-selected controlled key |
| Provider assurance | Organisation-specific | Tenant-owned controlled key |

## Required framework record

Every framework version must contain:

- Stable framework and version identifiers.
- Jurisdiction, regulator and applicable service types.
- Publication, effective and superseded dates.
- Source title and controlled source reference.
- Requirement hierarchy and display order.
- Evidence examples clearly labelled as guidance, not mandatory proof unless specified.
- Links to templates, policies, audits and assurance tests.
- Reviewer, approval state and change summary.
- Migration or impact notes for affected customer content.

## Core relationships

```text
Framework -> Version -> Requirement -> Assurance test
                                  -> Evidence mapping
                                  -> Policy/template mapping
                                  -> Internal readiness result
```

An organisation selects applicable frameworks and service types. Its evidence
and internal results reference the exact framework version used at the time.

## Safety boundaries

- A framework update must not silently rewrite historical assessments.
- Draft or unreviewed content must never appear as current regulatory guidance.
- A requirement change produces an impact list; an authorised manager decides the response.
- Mock inspection results are internal readiness evidence, not official ratings.
- QCGMS must display the applicable jurisdiction instead of assuming England.
- Official regulator connectivity is separate from framework content and requires its own approved route.

## Phase allocation

Phase 0 defines this abstraction. Phase 2 supplies canonical identities and
relationships. Phase 6 implements framework records, versioning, evidence maps,
change impact and mock inspection configuration.
