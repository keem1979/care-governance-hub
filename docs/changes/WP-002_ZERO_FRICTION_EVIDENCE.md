# WP-002 — final Gate B / Gate C evidence record

## Verdict and boundary

- Branch: `wp-002-zero-friction-evidence`; protected V120 baseline: `124474c`.
- Validated implementation HEAD: `6bbca67fd330729246b1e4f9de3db4287c74d915` (before this report-only update).
- Gate B: **PASS for WP-002 engineering scope**, with provenance and legacy-verifier limitations below.
- Gate C: **BLOCKED for final release sign-off**. Authenticated desktop/mobile screens and interactions were inspected, but screenshot bytes were available only in the browser tool output and could not be persisted as reviewable screenshot files.
- Release Manager: **HOLD**. Product Owner review is not yet ready.
- Schema migration: **No**. `prisma/schema.prisma` and `prisma/migrations` are unchanged from V120.
- No production database, deployment, publication, production-branch merge, or production migration was used.

## Implementation and change sequence

The existing canonical `Evidence`, `EvidenceVersion`, `RegisterEntryEvidence`, `ActionEvidence`, and `ActivityLog` architecture is reused. One contextual server endpoint resolves the Incident, Complaint, Safeguarding, or Action source and applies tenant, location, role, record-state, and upload/search permissions. Upload records a private file, SHA-256 checksum, version 1.0, canonical relationship, and audit history. It uses neutral `OTHER/OTHER_SPECIFIED` classification instead of guessing a document type. The Action role is derived from a purpose-specific entry point or selected for generic linking. Attaching Evidence makes no verification, effectiveness, management assurance, or closure decision.

The shared dialog in `src/components/contextual-evidence.tsx` implements file/photo upload and authorised Search → Preview → Link. Incident, Complaint, and Safeguarding place one Add Evidence action after Current work and before the collapsed record-context disclosure. The full administration form at `/evidence/new` remains available. Provider Control create and draft forms use fieldset/legend groups with individual checkbox names.

Commits since `124474c`, in order: `1f89278`, `cbaaad6`, `db2163a`, `d67f7cf`, `38880e7`, `414f95e`, `58bcdbb`, `76c9d4e`, `7c93436`, `30d61e0`, `64c69f5`, `bd4b675`, `846a865`, `55c95a4`, `c9e290c`, `f4ec2ab`, `4a0af76`, `6bbca67`. This report update follows those commits.

Changed files from V120: `.gitignore`; `eslint.config.mjs`; `playwright.config.ts`; `docs/changes/WP-002_ZERO_FRICTION_EVIDENCE.md`; `docs/ux/WP-002_ZERO_FRICTION_EVIDENCE.md`; `docs/work-packages/WP-002_ZERO_FRICTION_EVIDENCE.md`; `src/app/(app)/actions/[id]/assurance/page.tsx`; `src/app/(app)/actions/[id]/page.tsx`; `src/app/(app)/registers/[key]/[id]/page.tsx`; `src/app/api/evidence/contextual/route.ts`; `src/components/assurance-workflow-controls.tsx`; `src/components/contextual-evidence.tsx`; `src/components/provider-control-draft-editor.tsx`; `src/components/provider-control-library.tsx`; `tests/e2e/contextual-evidence.spec.ts`; `tests/unit/contextual-evidence.test.ts`.

## Gate B — engineering assurance

All database work targeted only `127.0.0.1:5432/care_governance_hub_test` with fictional fixtures. The repository-root `.env` destination was checked without printing the connection string or credentials. The test role could not create databases, so disposable schemas within that test database were created and dropped for migration and performance work.

| Check | Result |
|---|---|
| Full automated suite | **PASS:** 379/379 tests, 76/76 files; 0 failed |
| Focused contextual endpoint suite | **PASS:** 19/19 tests |
| TypeScript | **PASS:** `npm run typecheck` |
| ESLint | **PASS:** `npm run lint` |
| Prisma | **PASS:** `npm run db:validate` and `npm run db:generate` |
| Fresh migration path | **PASS:** 63/63 migrations in isolated disposable schema; 145 tables |
| Applicable V120 upgrade path | **PASS:** 60/60 baseline migrations, then 3/3 subsequent migrations; fictional Incident, Complaint, and Safeguarding upgrade verifiers passed |
| Next.js production build | **PASS:** `npm run build:next`; 148 static pages |
| Sites/Vinext production build | **PASS:** `npm run site:build`; 5/5 stages |
| Contextual browser E2E, Chromium and mobile | **PASS as supplied by user from unrestricted local Playwright:** one test in each project, 2/2 project cases |
| Evidence controls release gate, Chromium and mobile | **PASS as supplied by user:** one test in each project, 2/2 project cases; 57.0 s and 47.1 s respectively |
| Live server security negatives | **PASS:** 14/14. Ten mutation negatives returned 400/403/404 with no Evidence, version, relationship, or ActivityLog write; four search negatives excluded cross-tenant, unauthorised-location, and archived Evidence or rejected explicit unauthorised location |
| Live positive integrity | **PASS:** 12/12. New upload created one canonical Evidence, one current v1.0 version, a matching SHA-256 private file, one Incident link, and CREATE audit event. Two reused records remained canonical and gained one link and audit entry each |
| 5,000-record Evidence query | **EXECUTED:** 5,000 synthetic rows inserted in 119.231 ms; filtered search EXPLAIN execution 4.648 ms; deep page offset 2,400 execution 8.418 ms |

The four browser PASS results are user-supplied external run evidence; this restricted sandbox's attempted Chromium launch ended at `spawn EPERM` before assertions. The two spec files contain one test each and no skipped cases. No numerical search latency threshold was defined, so measured query times are reported without an invented SLA claim. The isolated legacy Audit verifier failed because it hardcodes `public`, whereas the disposable migration checks intentionally used isolated schemas. This verifier limitation does not negate the fresh and applicable WP-002 upgrade results; separate legacy convergence/seed proof was not rerun here.

Security probes covered cross-tenant source and Evidence IDs, source and Evidence location mismatches, archived Evidence, closed and archived Incidents, closed and archived Actions, missing `EVIDENCE_UPLOAD`, and search filtering. Source state and permissions remain server enforced. Closed/archived Action rejection was hardened in `f4ec2ab`; terminal Action regression tests are included in the 379 passing tests. Temporary security fixture changes were restored.

Build notes: Next.js production build completed. The local Next.js dev server still emitted the nonblocking `atom-wordmark.png` aspect-ratio warning. Sites/Vinext completed with nonblocking future-compatibility warnings for JSON import attributes and an extensionless plugin import; `/api/settings/policy-branding/logo` remains a runtime-resolved asset.

## Gate C — rendered RM experience

An authenticated fictional Incident at `http://localhost:3000/registers/incidents/6292ac66-dcd3-41ac-9720-82579650da02` was inspected at desktop 1440×900 and mobile 390×844. Add Evidence was visible in Current work before the collapsed “Record context, people and Evidence” section. One Add Evidence control was present. No horizontal overflow was observed on mobile. Browser captures were displayed during the session for desktop current-work action, upload success, existing Preview, mobile action chooser, mobile Preview, and mobile success. **No saved authenticated screenshot path is available**, so this required artifact remains open. `outputs/wp002-local-login.png` is only a login smoke image and is not WP-002 Gate C proof.

Observed new flow: **Add Evidence → Upload file or photo → Choose file or photo → select fictional PNG → Evidence added → Done**. The linked Incident count changed 0→1. No title, category, source, owner, location, or other typed metadata field appeared in the routine dialog. Success text says Evidence is linked and review or assurance remains a human decision.

Observed existing flow: **Add Evidence → Use existing Evidence → enter query → Search → select result/Preview → Link Evidence → Done**. Desktop linked count changed 1→2; mobile changed 2→3. Search is explicit, with no automatic concurrent search. A result preview showed title, type, source reference, and location. Reuse linked existing canonical IDs without creating new Evidence records.

### Measured interaction burden

The retained advanced form was rendered at `/evidence/new` and its DOM controls counted: **23** input/select/textarea controls, **6** HTML-required controls. Source type and owner had defaults, leaving **4 manual required choices** for a basic upload (source organisation/system, core family, contextual type, file). Contextual upload presented **1 required file selection** and **0 typed metadata fields**. The routine task therefore exposed **22 fewer form controls** (23→1) and **3 fewer manual required choices** (4→1). The direct new path used four button actions (Add Evidence, Upload file/photo, Choose file/photo, Done) plus file selection; existing reuse used five button actions (Add Evidence, Use existing, Search, select result/Preview, Link) plus one query entry and optional Done. No elapsed-time saving or historical V120 end-to-end click saving is claimed; the comparison is with the unchanged advanced form at current HEAD.

System-derived fields confirmed through endpoint/integrity checks: authenticated uploader, tenant, source record, authorised location, timestamp, filename-derived title, canonical ID, relationship, private storage key, checksum/version, and audit event. Optional details remain after completion. The full form remains available for advanced provenance/classification. Uploading or linking did not assert sufficiency, effectiveness, management assurance, closure, or an official CQC judgement.

| Specialist | Verdict |
|---|---|
| RM Advocate | **PASS** — visible in-context task, completed new and reuse flows; direct rendered session used Incident |
| Evidence Experience Specialist | **PASS** — canonical upload/reuse and optional later detail; Preview is metadata, not file content |
| Form Simplicity Specialist | **PASS** — one file choice and zero typed metadata; measured 23→1 controls |
| Plain Language Reviewer | **PASS** — success wording preserves human judgement |
| UX Designer | **PASS** — restrained action hierarchy above disclosure on desktop/mobile |
| Governance QA Consultant | **PASS** — provenance, relationship and audit separation; no auto assurance |
| CQC-style Inspector | **PASS for inspectability review**, not an official regulator endorsement |
| Accessibility/Mobile Reviewer | **PASS for reviewed scope** — dialog semantics, focus/keyboard implementation and fieldset/legend groups; no personal live screen-reader run |
| Security/Tenancy Reviewer | **PASS** — 14/14 negatives and 12/12 integrity checks on disposable DB |
| Test Engineer | **PASS for directly verified code/build/migration checks**; cannot personally attest sandbox Playwright; external browser PASS evidence separately attributed |
| Release Manager | **HOLD** — authenticated screenshot files remain open |

Complaint and Safeguarding use the same shared component and placement condition but were not separately rendered in this final Gate C session. Both release-gate Playwright projects passed as externally supplied. Static review confirmed Provider Control fieldset/legend semantics on create and draft forms; no live screen-reader session was performed.

Nonblocking copy/coverage notes: existing mode says “No authorised Evidence found” before the first Search; “Add a note or change details” after reuse could imply editing a shared record; Preview contains metadata rather than file contents; source management chronology does not gain a new visible event even though relationship and ActivityLog do. None changes canonical Evidence or human decision boundaries.

## Remaining blocker

Persist final authenticated desktop and mobile screenshots to reviewable file paths and append those paths here. Reconfirm Release Manager verdict after those artifacts exist. Until then: **BLOCKED — NOT READY FOR PRODUCT OWNER REVIEW**.
