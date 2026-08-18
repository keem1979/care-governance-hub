# Data Protection Impact Assessment — controlled draft

Status: **approval required before live personal data**  
Scope owner: QCGMS product owner  
Controller sign-off: subscribing care-provider organisation  
Review triggers: material feature, data, supplier, hosting, integration, AI or
regulatory change; security incident; or annual review.

## Processing scope

QCGMS supports governance, assurance, care-plan control, workforce compliance,
audits, incidents, risks, actions, evidence and inspection preparation. It may
therefore hold identity, contact, employment and special-category health or care
information. It is not a daily care-record, eMAR, rostering, payroll or finance
system. The provider determines purposes, lawful bases, access and retention as
controller; the contracted service operates only on documented instructions.

## Necessity and minimisation controls

- Use internal references and the minimum person-level information needed to
  connect governance records.
- Keep narrative factual, proportionate and relevant; do not copy an entire care
  record where a controlled link or concise evidence statement is sufficient.
- Use organisation, location, role and individual permission boundaries.
- Archive records rather than deleting history through ordinary workflows.
- Do not enable a supplier integration until its minimum dataset, purpose,
  controller instruction, mapping, failure behaviour and retention are approved.

## Risk assessment

| Risk | Inherent severity | Implemented treatment | Residual decision |
| --- | --- | --- | --- |
| Cross-tenant disclosure | High | Server-side organisation/location scoping, permissions, negative tenant tests | Independent test required before live launch |
| Account takeover | High | Mandatory TOTP MFA, durable rate limits, revocable sessions, recovery codes | Monitor failures and test recovery |
| Unauthorised browser request | High | Same-site secure cookie, origin/fetch-site checks, security headers | Independent test required |
| Excessive or inaccurate narrative | High | Data-minimisation instructions, controlled updates, activity history | Controller training and audit required |
| Lost availability or corrupt data | High | Managed database design and documented restore/reconciliation process | Hosting backup and restore evidence required |
| Unsafe reliance on software output | High | Human approval, provenance, no autonomous care decision, clinical hazard process | Clinical Safety Officer acceptance required |
| Supplier or international-transfer risk | High | No live third-party API feeds; approval gates before connection | Contract and supplier schedule required |

## Individual rights and incidents

Requests for access, correction, restriction, objection, portability or erasure
must be logged by the controller, identity-checked, assigned and answered within
the applicable legal timetable. Ordinary users must not hard-delete a linked
client profile. The controller must first assess care-record duties, safeguarding,
legal holds, third-party rights and data held by subprocessors. Approved extraction,
rectification, restriction or deletion work must preserve an accountable audit
record without retaining unnecessary content.

Suspected loss, disclosure, alteration or unavailability follows
`INCIDENT_RESPONSE.md`. This draft does not replace a customer-specific DPIA,
lawful-basis record, privacy notice or legal advice.
