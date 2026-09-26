# WP-002 UX — Zero-Friction Evidence

## Existing implementation map

### Canonical Evidence
`prisma/schema.prisma` contains one canonical `Evidence` record with organisation/location, title, classification/currentness, owner, dates, related-module context, confidentiality, provenance, uploader and audit timestamps. File bytes are versioned in `EvidenceVersion`; verification remains a separate decision.

### Generic Evidence Library upload
`src/components/evidence-form.tsx` is an Evidence administration form. New Evidence exposes a large metadata surface around the file input. `src/app/api/evidence/route.ts` validates taxonomy, owner, confidentiality, source and location, then stores private bytes, checksum, version, canonical Evidence and ActivityLog.

This remains useful for deliberate Evidence administration. It must not be the normal RM attachment experience.

### Existing reuse
`/api/evidence/authorised-options` already provides bounded server-scoped search.

`ActionEvidenceManager` already provides source-related/recent/search results, metadata preview and canonical linking. The missing capability is new upload inside the current governed context.

### Register context
Incident, Complaint and Safeguarding are canonical `RegisterEntry` records. Their detail page already knows source id/reference, authorised server context, location, linked Client/Staff, owner and linked Evidence. `RegisterEntryEvidence` is the canonical relationship.

### Action context
Action has canonical `ActionEvidence` role relationships. `linkActionEvidence()` preserves snapshots and attribution. Action completion already links existing Evidence as `COMPLETION`.

## Context map
| Context | Location/source | Client/Staff | Relationship purpose |
|---|---|---|---|
| Incident detail | known | known when linked | Supporting by default; specific only when named |
| Complaint detail | known | known when linked | Supporting by default; specific only when named |
| Safeguarding detail | known | known when linked | Supporting by default; specific event/purpose when named |
| Action detail | known | derived where present | selected only in generic drawer |
| Action completion | known | derived | **COMPLETION** |
| Verification | known | derived | **VERIFICATION** |
| Effectiveness | known | derived | **EFFECTIVENESS** |

## Field-source audit
| Field | Decision |
|---|---|
| File/photo | KEEP |
| Tenant/organisation | AUTO |
| Uploader | AUTO |
| Upload timestamp | AUTO |
| Location | DERIVE from authorised source |
| Client/Staff | DERIVE where source knows them |
| Source record | LINK |
| Action Evidence role | DERIVE when launching control names the purpose; SELECT only in generic Action linking |
| Title | AUTO from filename; editable later |
| Source type | AUTO as uploaded document |
| Source reference | DERIVE |
| Owner | AUTO for routine contextual upload; change later if needed |
| Confidentiality | AUTO conservative governed default; change later if needed |
| Taxonomy family/type | DERIVE only when semantically certain; otherwise neutral canonical fallback and optional Change details |
| Evidence/review dates | OPTIONAL AFTER UPLOAD |
| Description/note | OPTIONAL AFTER UPLOAD |
| provenance/author/URL/tags/provider subtype | OPTIONAL AFTER UPLOAD |

## New Evidence flow
1. **Add Evidence**
2. Choose **Upload file/photo** or **Use existing Evidence**
3. On upload, choose file/photo
4. Server resolves and authorises the current source record
5. QCGMS creates canonical Evidence + version, applies server-owned context, links it to the source and logs the event
6. **Evidence added**
7. Optional: **Add a note / Change details**

No metadata form precedes file choice.

## Existing Evidence flow
**Add Evidence → Use existing Evidence → Search → Preview → Link**

No navigation away.

## Classification safety
Relationship role and Evidence taxonomy are different. A button labelled **Add completion Evidence** can safely establish the Action relationship role `COMPLETION`; it cannot prove what type of document was uploaded.

Do not auto-classify arbitrary files as Incident Report, Complaint, Safeguarding Outcome, etc. merely from the parent record. Use a neutral canonical fallback where no specific type is certain and allow authorised users to change details after upload.

## Reuse target
Extend the proven in-context Evidence drawer. Do not create module-specific Evidence forms.

## Mobile
Normal path: **Add Evidence → Choose file/photo → Done**.

## Plain language
Use: Add Evidence; Upload file or photo; Use existing Evidence; What does this show? (optional); Change details; Evidence added.

Avoid in the routine flow: Create Evidence Record; Evidence relationship type; taxonomy family; provenance metadata; source ID.

## Burden
### Before
The standalone new-Evidence form exposes more than twenty visible metadata/control fields around the upload, including required classification/source/owner choices.

### After target
- modules left: 0
- mandatory typed fields: 0
- mandatory user input: file/photo
- tenant/location/user/timestamp/source/relationship: automatic or derived
- optional details: after upload

## Gate A
**PASS**
- RM Advocate: PASS
- Form Simplicity: PASS
- Evidence Experience: PASS
- Plain Language: PASS
- Governance QA: PASS
- CQC evidence test: PASS

No ADR is needed unless implementation discovers a requirement for schema/lifecycle changes.
