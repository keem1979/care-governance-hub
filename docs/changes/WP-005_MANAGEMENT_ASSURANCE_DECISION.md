# WP-005 — Management Assurance Decision Experience

**Status:** BLOCKED at the automated browser gate; no Product Owner merge request yet.
**Branch:** `wp-005-management-assurance`
**Base:** `94201c3827323de50db82be58bee30f4e5fe03c0` (local main after approved WP-004 merge)
**Environment:** fictional fixtures in `127.0.0.1:5432/care_governance_hub_test` only. No production access, remote push, merge, deployment, or schema migration.

## Delivered

- An immediately visible Management Assurance decision surface shows **Needs attention**, **Ready for management review**, or an attributable closed decision. It names unresolved requirements, links to the relevant work area, and presents the current completion account, verification, effectiveness, unresolved dependencies, and authorised linked Evidence.
- The human closure decision sits directly after that surface. It retains two required inputs: choose linked Evidence and record a rationale. “Ready” means recorded preconditions are met; it is not a verification, effectiveness, or closure decision.
- Reopening requires provider closure authority, Action-management permission, location scope, and an attributable reason. Earlier closure, verification, effectiveness, and Evidence relationships remain in history. Current progress and completion reset; old verification/effectiveness cannot satisfy a new assurance cycle. The page, closure endpoint, and effectiveness endpoint use the same cycle rule based on immutable record creation times.
- Closure/reopening history is visible as the latest 20 events; the database audit log remains append-only. Existing full chronology and canonical Action/Evidence records remain available.

## Specialist review

| Specialist | Verdict | Evidence / limit |
| --- | --- | --- |
| RM Advocate | PASS | Decision and next action are visible before the long chronology. |
| Form Simplicity | PASS | No new closure field; two required inputs remain. Reopening adds one reason. |
| Evidence Experience | PASS | Existing authorised Evidence titles and roles link to canonical records. |
| UX Designer | PASS | Closure is beside readiness; section heading is unnumbered so visual order is coherent. |
| Plain Language | PASS | Status says “Ready for management review” and explicitly reserves the human decision. |
| Governance QA Consultant | PASS | Reopened work needs fresh completion, verification, and (where required) effectiveness. |
| CQC-style reviewer | PASS | Earlier decisions remain traceable and cannot silently become current assurance. |
| Security/Tenancy Reviewer | PASS | Existing scope and permission checks remain; reopen now also enforces provider role authority. |
| Test Engineer | PASS for code review; execution pending | Targeted browser assertions are coherent, but Chromium/mobile cannot be certified in this sandbox. |
| Accessibility/Mobile Reviewer | PASS for code review; execution pending | Labelled status, full text, 44px links, mobile overflow checks and screenshot assertions added. |
| Release Manager | HOLD | Automated browser/mobile gate and persisted screenshots remain outstanding. |

## Gate B evidence

| Check | Result |
| --- | --- |
| Automated unit/integration suite | PASS **386/386**, 77 files |
| TypeScript | PASS |
| ESLint | PASS |
| Prisma schema validation | PASS |
| Disposable fresh migrations | PASS, 65 migrations, temporary schema removed |
| Existing direct security/integrity gate | PASS **27/27** |
| WP-005 direct assurance gate | PASS **18/18**: guarded fictional setup, role/tenant denial, closure/reopen, reason, reset, immediate stale reclosure denial, renewed work and fresh Low closure, append-only events. Its High Action is manually put into a closed state solely to probe role authority; this is not a complete High lifecycle proof. |
| Evidence search performance | PASS, 5,000 fictional rows: search **4.552 ms**, page **9.111 ms**, both below 250 ms gate |
| Next.js production build | PASS |
| Sites/Vinext build | PASS |
| Chromium Playwright | BLOCKED: `browserType.launch` returned `spawn EPERM` before an application assertion. Three attempted tests cannot be counted as application failures or passes. |
| Mobile Playwright | NOT RUN in this sandbox; same Chromium launcher is restricted. |

No WP-005 Prisma schema change or migration was required. The earlier WP-004 migration evidence is preserved. No production database was used.

## Gate C rendered review and measured burden

An authenticated fictional Registered Manager viewed the actual production Next.js build at 1280px desktop and 390px mobile through the in-app browser. A separate checkout of the pre-WP-005 baseline used the same fictional fixture state and role. Measurements are document positions from the top of the Action assurance page; they are not click counts.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Closure control, desktop 1280px | 3,654px | 882px | 2,772px earlier (75.9%) |
| Closure control, mobile 390px | 5,683px | 1,911px | 3,772px earlier (66.4%) |
| Required closure fields | 2 | 2 | No new typing |
| Link jump to closure | 1 click | 1 click | No claimed click reduction |
| Horizontal overflow, desktop/mobile | None | None | Maintained |

The rendered High Action showed **Needs attention** and linked blockers; the Low Action showed **Ready for management review**, named linked Evidence, and the nearby human closure form. These were visually inspected on desktop and mobile. Playwright screenshots are not yet persisted, so Gate C is not complete.

## Remaining browser gate

Run the targeted Action assurance and WP-004 regression specs in an unrestricted local Windows terminal, against the repository's already configured disposable database. The Playwright config loads root `.env`; do not print the URL or credentials. Use a free test port and preserve outputs under `../../outputs/WP-005_GATE_C`. Expected tests to execute: release gate 3 per project, mobile assurance 1 on mobile, WP-004 lifecycle 1 per project = **9**. Do not infer PASS from expected counts. The release-gate desktop spec saves `wp005-ready-desktop.png` and `wp005-closed-desktop.png`; the mobile spec saves `wp005-needs-attention-mobile.png` and `wp005-ready-mobile.png`.

## Known non-blocking follow-ups

The pre-existing wordmark aspect-ratio warning and mobile hydration attribute warning (cause unconfirmed) are tracked separately in `docs/NON_BLOCKING_UI_FOLLOWUPS.md`. They are not WP-005 product changes.

**Final verdict:** BLOCKED — automated desktop/mobile browser results and persisted screenshots are required before Product Owner review.
