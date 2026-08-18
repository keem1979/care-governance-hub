# QCGMS Product Roadmap

This roadmap records the approved build sequence. A later phase must not be
presented as live until its implementation, safety, security and acceptance gate
have passed.

| Phase | Outcome | Release gate |
| --- | --- | --- |
| 0. Product architecture | Product charter, canonical model, UK framework abstraction, module map and measures | Documentation and public position agree; no conflicting source of truth |
| 1. Trust foundation | MFA, durable abuse protection, tenant tests, privacy controls, recovery and clinical-safety process | No critical security finding or unresolved high-severity safety hazard |
| 2. Canonical data and synchronisation | Unique identity, dependency review, material-change classification and anomaly work queue | Ambiguous identities require human reconciliation; changes never silently overwrite governed records |
| 3. Assurance and improvement | Evidence-backed closure, duties separation, root cause, recurrence, external dependency and improvement plans | Complete issue-to-sustained-improvement chronology is demonstrable |
| 4. Management intelligence | RM, owner and location command views, delegation and saved views | Priority decisions are reachable within three interactions |
| 5. Care and workforce assurance | Controlled care changes, staff quick view, understanding checks and competency matching | Only approved current instructions are shown; safety hazards pass review |
| 6. Evidence and regulatory assurance | Provenance, validity, governed templates, policy mapping, framework changes and mock inspection | Every claim links to current, relevant source evidence |
| 7. Governance control | Unified calendar, meetings, decisions, commissioner and external-action oversight | Decisions and external delays remain linked and visible |
| 8. Connected governance | APIs, imports, reconciliation, source-of-truth controls and safe offline capture | No silent integration failures or automatic ambiguous merges |
| 9. Trustworthy Abi | Source citations, confidence, audit, feedback and escalation | Known, uncertain and prohibited question suites pass |
| 10. Configurable delivery | Versioned tenant settings, sandbox promotion, notification controls, onboarding and adoption analytics | Safe defaults cannot be disabled; go-live readiness is evidenced |
| 11. Validated launch | DBAM and external pilots, commercial service and later privacy-preserving benchmarks | Measurable benefit, security evidence and paying intent from external providers |

## Release A - RM Governance Core

Phases 0-4 establish a secure, coherent management product. This is the first
commercially testable release and should be piloted before broadening scope.

## Release B - Care Assurance Operating Layer

Phases 5-7 connect governed care changes, workforce assurance, evidence,
frameworks and formal management decisions.

## Release C - Connected Governance Platform

Phases 8-10 remove duplicate entry safely, constrain AI and support controlled
customer configuration and implementation.

## Work deliberately deferred

- eMAR, rostering, payroll, invoicing, credit control and daily care recording.
- Official regulator connectivity without an approved assurance pathway.
- Privacy-preserving benchmarking before definitions, volume and DPIA permit it.
- Native mobile applications before offline data and synchronisation risks are proven.
