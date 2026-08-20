# Phase 8 connected-governance acceptance record

## Build acceptance criteria

- [x] Integration proposals remain inactive until eight assurance gates, a named owner and a future review date are recorded.
- [x] API credentials are issued only for active inbound connections, displayed once and stored only as a hash and prefix.
- [x] Inbound events are idempotent, payload-limited and either linked by an approved external identifier or quarantined for reconciliation.
- [x] An inbound event does not create, update or delete a canonical care, workforce, location or external-party record.
- [x] Authenticated event rejection increments visible connection failure state without retaining the rejected payload.
- [x] CSV imports are checksum-controlled, limited to 500 rows and analysed before apply.
- [x] Exact imported identities link without overwrite; ambiguous identities cannot be applied automatically.
- [x] Creating reviewed staff rows also creates the standard training requirements and refreshes controlled workforce evidence.
- [x] One source-authority decision per canonical entity type records governed fields, rationale, approver and review date.
- [x] Offline content is encrypted before browser storage and requires its user-held passphrase for synchronisation.
- [x] Synchronised offline notes enter management review and accepted notes remain unverified evidence until separately verified.
- [x] Offline source conflicts require an explicit comparison decision and never overwrite the source record.

## Release gate

- [x] Tenant and location scope protect every new signed-in read and mutation.
- [x] Inbound bearer credentials resolve their tenant and connection server-side.
- [x] Connection, credential, event, import, source-authority and offline-review decisions create activity history.
- [x] No plaintext API credential or offline encryption passphrase is persisted by QCGMS.
- [x] Responsive cards and compact row summaries avoid wide operational tables.
- [x] Schema validation, type checking, lint, 261 unit tests and the production build pass.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment connection, import, reconciliation and offline-capture smoke checks.

## Safety boundary

Connected Governance provides controlled data exchange and reviewed offline
observation capture. It is not an eMAR, clinical decision system, emergency
channel, real-time safeguarding notification route or automatic master-data
merger. A named manager remains responsible for supplier assurance, data
protection, source authority, reconciliation, evidence verification and safe
operational fallbacks.
