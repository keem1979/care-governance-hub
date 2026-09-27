# WP-010 — Inspection / Commissioner Readiness Compilation

**Branch:** `wp-010-inspection-commissioner-readiness` from local `main` `3e2544716823203980caecb5a10aa5014798b912` after WP-009.
**Boundary:** QCGMS only; no schema change, new governance score, remote push or deployment. Local database work used only disposable `127.0.0.1:5432/care_governance_hub_test` with fictional fixtures.

## Product and governance result

The Inspection Centre now leads with **What needs attention**. It puts the calculated blockers, overdue reviews and explicit RM decision state ahead of the framework percentage summary. The first eight items are visible; a named same-page disclosure retains every remaining item. Recorded Critical then High residual risks lead a separate sourced list alongside commissioner obligations, monthly KPI returns and commissioner contract records. Each row retains its original status, location, relevant due date and direct source link. An obligation link reaches its anchored record in Governance Control, including records beyond the former 100-row listing cap. The complete list remains reachable in a same-page disclosure and in the printable pack.

The pack leads with scope, generated date, outstanding requirement work and serious risk/commissioner/return records. It retains every source-linked requirement, Evidence mapping, RM decision, sign-off and detail in a later sourced appendix. The UI explicitly says this is an internal compilation, not a regulator judgement, new assurance decision, submission or acceptance. Calculated percentages remain existing supporting data, behind disclosure on the Centre. The existing 24-control advanced requirement form and all canonical Action/Evidence records remain available; compilation requires no new entry.

The security review found a confirmed cross-location linked-record disclosure. Requirement queries now scope each Evidence, Audit, Register and Action child before calculating assurance or rendering Centre, pack, CSV and report data. Evidence Assurance claims and mapping updates enforce child scope. Mock-inspection samples enforce parent and child scope and reject updates after completion. A location-limited view of an organisation-wide requirement cannot claim full assurance; the stored RM decision remains unchanged. Automatic tags, live signals and linked records remain suggestions/context and no longer fill evidenced CQC categories without RM-recorded coverage or a current, suitable Evidence mapping. Unseen pre-existing links survive a normal restricted-location form save. No migration was required.

## RM burden and completeness

These are interface counts and navigation steps, not estimated minutes. The prior behaviour is checked from the pre-WP-010 source at `3e25447`; the final behaviour is checked in authenticated desktop/mobile Playwright and the final screenshots.

| Task / surface | Before | After |
| --- | ---: | ---: |
| View first inspection gap from default Centre | 1 tab click to **Attention required** | 0 view changes; **What needs attention** is on the default page |
| View first overdue review from default Centre | 1 tab click to **Overdue reviews** | 0 view changes; overdue review joins current work |
| Open a requirement source from current work | At least 1 tab click plus 1 record link | 1 direct record link |
| Requirement cards expanded in the 66-requirement fictional fixture | 66 on default Centre | 8 in current work; all 66 retained in named disclosure |
| Commissioner/return and serious-risk source list on Inspection Centre | 0; separate module visits needed | 1 combined scoped list with direct source links |
| Typed fields to compile/open the pack | 0 | 0 |

The default mobile viewport shows the current-work heading. The shared Data source panel and large page heading precede the first row, so some scrolling remains; this is a non-blocking usability follow-up. The eight-item preview never discards records: both disclosures were expanded in the final browser test.

## Gate B — Engineering evidence

| Check | Final result |
| --- | --- |
| Automated unit/integration | **444/444 PASS**, 81 files, via `npm.cmd run check`. |
| Focused WP-010 security/integrity | **8/8 PASS**: scoped linked reads, no inferred category coverage, limited organisation-wide view, unauthorised mapping 404, hidden link preservation, mock sample scope/completed lock, scoped commissioner query, uncapped compilation/source link. |
| Prisma / TypeScript / ESLint | PASS via `npm.cmd run check`. |
| Disposable database | Destination guard PASS; `prisma migrate status` reports **65 migrations**, schema up to date. No WP-010 migration. |
| Next.js production build | PASS; log `outputs/WP-010_GATE_B/next-build-final.log`. |
| Sites/Vinext production build | PASS; log `outputs/WP-010_GATE_B/vinext-build-final.log`. |
| 5,000-record probe | 5,002 scoped fictional/existing High-risk rows, fetch plus exception mapping **16.460 / 11.240 / 13.688 ms**; transaction rollback left zero WP-010 fixture rows. This measures the scoped query and mapping, not full page render. Evidence `outputs/WP-010_GATE_B/wp010-inspection-performance.txt`. |

No production data, migration or deployment was accessed. The full Evidence and Action lifecycle gates remain covered by the existing automated suite; WP-010 did not alter their domain models.

## Gate C — Authenticated browser and visual evidence

Final targeted Playwright run: **Chromium 2/2 PASS, mobile 2/2 PASS; 0 failed, 0 skipped**. It verified the default sourced queue, both same-page overflow disclosures when populated, permission-scoped organisation-wide pack warning, named filters/navigation, network idle, no error overlay/page errors, no Abi overlay on inspection routes, no horizontal overflow, and a semantic page snapshot. Browser processes closed on completion. The installed `agent-browser` CLI was unavailable on this host; the authenticated Playwright gate performed the equivalent page/overlay/snapshot/screenshot checks.

All eight screenshots below are nonzero and persisted outside the repository:

| Surface | Chromium | Mobile |
| --- | --- | --- |
| Inspection first viewport | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-inspection-first-viewport.png` | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-inspection-first-viewport.png` |
| Inspection full page | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-inspection-current-work.png` | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-inspection-current-work.png` |
| Pack first viewport | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-pack-first-viewport.png` | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-pack-first-viewport.png` |
| Pack full page | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-chromium/wp010-inspection-pack.png` | `outputs/WP-010_GATE_C/final-v5/wp010-inspection-readiness-bab26-before-calculated-summaries-mobile/wp010-inspection-pack.png` |

## Specialist verdicts

| Specialist lens | Verdict |
| --- | --- |
| System Architect / Backend | PASS: no new source of truth or schema; scoped read-only compilation and source links. |
| RM Advocate / UX / Form Simplicity | PASS: exceptions and direct source actions precede supporting scores; 0 new typed fields; full advanced form retained. |
| Evidence Experience | PASS for existing canonical mappings and explicit suitability/currentness; suggestions do not silently prove coverage. |
| Governance QA / CQC-style reviewer | PASS after same-page completeness, Critical/High priority and obligation anchor corrections; no compliance or regulator claim. |
| Security / Tenancy | PASS for reviewed scope and eight focused security/integrity checks, including unauthorised negative paths; no unresolved High/Critical isolation defect. |
| Plain Language / Accessibility / Mobile | PASS after refreshed desktop/mobile review; no overlay, clipped text or horizontal page overflow. Independent screen-reader audit not performed. |
| Test Engineer | PASS: 444 unit/integration and 4 authenticated targeted browser cases; prior reviewer HOLD findings were corrected and rerun. |
| Release Manager | READY for the approved **local non-fast-forward** WP-010 merge after clean-tree verification; no Preview or production authority follows from this verdict. |

Known non-blocking follow-ups: existing `atom-wordmark.png` aspect-ratio warning, previously unconfirmed mobile hydration attribute warning, Vinext native-config-loader/route-classification advisories, and mobile scrolling before the first current-work row. The current Vercel release track is separately blocked by unavailable Git authentication and unverified QCGMS Vercel project identity; WP-010 is not part of that frozen WP-005 release candidate.

**WP-010 verdict: READY FOR PRODUCT OWNER REVIEW / authorised local non-fast-forward merge.**
