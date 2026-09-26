# WP-002 — Zero-Friction Evidence, Stage 4 record

## Boundary and verdict

- Branch: `wp-002-zero-friction-evidence`; base: Version 120 `124474c`.
- Production, its database, and the production branch were not changed. No deployment, publication, or merge was performed.
- Schema migration: **No**. `prisma/schema.prisma` and `prisma/migrations` are unchanged from the base.
- Gate B: **FAIL (database-dependent checks blocked)**. A disposable local PostgreSQL runtime was unavailable; no live database was used.
- Gate C: **FAIL (not measured)**. Authenticated rendered workflows and before/after interaction counts could not be observed without test data in a disposable database.

## Architecture and changes

The implementation uses the existing `Evidence`, `EvidenceVersion`, `RegisterEntryEvidence`, and `ActionEvidence` models. The full Evidence administration form at `/evidence/new` remains available. `src/app/api/evidence/contextual/route.ts` resolves an Incident, Complaint, Safeguarding record, or Action on the server and validates the signed-in user's permission and source scope. Upload creates a canonical Evidence record, private file, SHA-256 checksum, version 1.0, source relationship, and ActivityLog within the existing architecture. It assigns a neutral `OTHER/OTHER_SPECIFIED` taxonomy rather than guessing document type. Action relationship roles remain separate from verification and effectiveness decisions.

`src/components/contextual-evidence.tsx` provides one in-context Add Evidence dialog with a file-first upload, mobile photo entry, and authorised Search → Preview → Link for reuse. Incident, Complaint, Safeguarding and Action pages expose it; Action completion, verification and effectiveness offer purpose-specific entry points. Successful upload stays on the source record, and optional note/details follow the upload. The existing full Evidence form is unchanged.

### Routine field-source review

| Field | Routine treatment |
|---|---|
| File/photo | Select; the only mandatory Evidence input |
| Tenant, uploader, timestamp | Server automatic |
| Source, location, relationship | Server derives from authorised record |
| Action purpose | Derived from named entry point; selected only for generic Action linking |
| Title | Derived from filename |
| Document classification | Neutral fallback; no professional inference |
| Note and advanced details | Optional after upload |

Mandatory typed Evidence metadata fields in the new dialog: **0**. This is a source/UI inspection result, not a measured browser burden reduction.

## Gate B evidence

| Check | Result |
|---|---|
| Prisma schema validation | PASS — `npm run db:validate` |
| TypeScript | PASS — `npm run typecheck` |
| ESLint | PASS — `npm run lint` |
| Automated unit tests | PASS — 375/375 tests in 76/76 files; 15 focused contextual endpoint tests |
| Next.js production build | PASS — `npm run build:next` |
| Sites/Vinext production build | PASS — `npm run site:build` |
| Local browser smoke check | PASS for `/login` only: HTTP 200, network idle, nonblank content, no framework overlay or captured console errors, interactive snapshot; browser closed |
| Authenticated desktop/mobile E2E | BLOCKED — no disposable local PostgreSQL |
| Database security negative tests | BLOCKED as live integration tests; 15 mocked boundary tests passed |
| Evidence storage and relationship integrity | BLOCKED as live integration tests; mocked checksum/version/ActivityLog and rollback tests passed |
| 5,000-record Evidence, Safeguarding and Complaint probes | BLOCKED — no disposable local PostgreSQL |
| Real UI accessibility review | BLOCKED for authenticated Evidence dialog; code inspection confirms labels, dialog semantics, focus return/trap, keyboard close, status/error announcements and mobile controls |

The runtime survey found no Docker, Podman, PostgreSQL service/binaries, or installed WSL distribution, and no server on `127.0.0.1:5432`. The development server used only a dummy localhost database URL for the public login smoke check. No production or live-data connection was used.

### Security and governance scope

The focused tests cover tenant-scoped source lookup, location mismatch rejection, mutation/upload permission checks, closed/archived record guards, invalid source/role/file rejection, existing Action role reuse, private-file rollback, and canonical version/checksum/activity creation. These are mocked route tests; cross-tenant search, preview, direct file access, and source-ID tampering still require real database integration checks. The new endpoint does not call verification, effectiveness, Management Assurance, closure, or lifecycle decision services. Evidence attachment alone does not assert sufficiency or reduce Risk.

## Gate C and burden

The intended new path is **Add Evidence → Upload file/photo → Done**. Existing reuse is **Add Evidence → Use existing Evidence → Search → Preview → Link**. Neither path requires leaving the source record by design. Actual before/after screens, click counts, mandatory fields, repeated fields, navigation, and Evidence Library dependence were **not measured in an authenticated browser**. No reduction percentage is claimed. The RM five-second test, CQC trail review, and desktop/mobile visual effectiveness reviews remain unverified.

The requested 16-agent review was not completed. Repository mapping, backend, frontend and test work used separate writers, but the named form-simplicity, Evidence-experience, plain-language, CQC, governance-QA and accessibility/mobile Gate C reviews remain pending.

Screenshot captured: `outputs/wp002-local-login.png` (local login smoke check only). Requested authenticated desktop/mobile Evidence screenshots were not captured.

## Remaining work before Product Owner review

Provide a disposable local PostgreSQL runtime; apply the normal fresh migration path and fictional/test seed; run desktop/mobile E2E, negative security and Evidence integrity integration checks, 5,000-record probes, rendered accessibility review, screenshots, and actual before/after burden measurements. Re-evaluate Gate B and then Gate C. No production database may be used.
