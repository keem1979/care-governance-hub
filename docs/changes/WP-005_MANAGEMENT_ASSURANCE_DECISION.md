# WP-005 — Management Assurance Decision Experience

**Status:** READY FOR PRODUCT OWNER REVIEW; no merge or deployment authorised.
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
| Test Engineer | PASS | Existing governance assertions were preserved; focused regression assertions now check the true completed-work account and the absence of an obstructing assistant. Chromium 4/4 and mobile 5/5 passed. |
| Accessibility/Mobile Reviewer | PASS | The decision region is labelled by its visible title. Fresh mobile screenshots show the Ready and Needs attention headings, links and actions without assistant overlap or horizontal clipping. The missing work account is stated transparently. |
| Release Manager | READY FOR PRODUCT OWNER REVIEW | Gate B and Gate C evidence is complete; no unresolved WP-005 blocker. |

## Gate B evidence

| Check | Result |
| --- | --- |
| Automated unit/integration suite | PASS **386/386**, 77 files; rerun after the final visual corrections |
| TypeScript | PASS at final state |
| ESLint | PASS at final state |
| Prisma schema validation | PASS |
| Disposable fresh migrations | PASS, 65 migrations, temporary schema removed |
| Existing direct security/integrity gate | PASS **27/27** |
| WP-005 direct assurance gate | PASS **18/18**: guarded fictional setup, role/tenant denial, closure/reopen, reason, reset, immediate stale reclosure denial, renewed work and fresh Low closure, append-only events. Its High Action is manually put into a closed state solely to probe role authority; this is not a complete High lifecycle proof. |
| Evidence search performance | PASS, 5,000 fictional rows: search **4.552 ms**, page **9.111 ms**, both below 250 ms gate |
| Next.js production build | PASS on the final corrected files |
| Sites/Vinext build | PASS on the final corrected files |
| Chromium Playwright | PASS **4/4** on final state: three Action assurance release-gate cases and the WP-004 lifecycle regression. The previously failing region-name assertion and actual completed-work regression passed. |
| Mobile Playwright | PASS **5/5** on final state: mobile usability, three Action assurance release-gate cases, and the WP-004 lifecycle regression. The mobile assistant-overlap regression passed. |
| Browser launcher | Playwright's bundled headless shell returned `spawn EPERM` in this process sandbox. The installed Google Chrome executable launched successfully. An optional `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` config switch ran the same Chromium-engine projects and unchanged assertions; the default launcher remains unchanged. |

No WP-005 Prisma schema change or migration was required. The earlier WP-004 migration evidence is preserved. No production database was used.

## Gate C rendered review and measured burden

An authenticated fictional Registered Manager viewed the actual production Next.js build at 1280px desktop and 390px mobile through the in-app browser. A separate checkout of the pre-WP-005 baseline used the same fictional fixture state and role. Measurements are document positions from the top of the Action assurance page; they are not click counts. The targeted browser suites then exercised the corrected decision region on desktop and mobile.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Closure control, desktop 1280px | 3,654px | 882px | 2,772px earlier (75.9%) |
| Closure control, mobile 390px | 5,683px | 1,911px | 3,772px earlier (66.4%) |
| Required closure fields | 2 | 2 | No new typing |
| Link jump to closure | 1 click | 1 click | No claimed click reduction |
| Horizontal overflow, desktop/mobile | None | None | Maintained |

The rendered High Action showed **Needs attention** and linked blockers; the Low Action showed **Ready for management review**, named linked Evidence, and the nearby human closure form. Fresh screenshots were visually inspected on desktop and mobile. The mobile assurance page no longer displays the floating assistant over the decision heading. The closed desktop decision shows the actual medicines work account instead of the later closure bookkeeping note. The Low fixture has no separate completion account and now says so explicitly. Playwright confirmed the region by accessible role/name and persisted the following non-empty authenticated screenshots:

| Review image | Exact path | Size |
| --- | --- | ---: |
| Desktop ready | `C:\Users\jkeem\Documents\Codex\2026-09-26\referenced-chatgpt-conversation-this-is-an\outputs\WP-005_GATE_C\chromium\action-assurance-release-g-4c9a5-ness-and-closure-boundaries-chromium\wp005-ready-desktop.png` | 487,561 bytes |
| Desktop closed | `C:\Users\jkeem\Documents\Codex\2026-09-26\referenced-chatgpt-conversation-this-is-an\outputs\WP-005_GATE_C\chromium\action-assurance-release-g-4c9a5-ness-and-closure-boundaries-chromium\wp005-closed-desktop.png` | 335,135 bytes |
| Mobile needs attention | `C:\Users\jkeem\Documents\Codex\2026-09-26\referenced-chatgpt-conversation-this-is-an\outputs\WP-005_GATE_C\mobile\action-assurance-mobile-Ac-bb401-usable-on-a-mobile-viewport-mobile\wp005-needs-attention-mobile.png` | 2,789,649 bytes |
| Mobile ready | `C:\Users\jkeem\Documents\Codex\2026-09-26\referenced-chatgpt-conversation-this-is-an\outputs\WP-005_GATE_C\mobile\action-assurance-mobile-Ac-bb401-usable-on-a-mobile-viewport-mobile\wp005-ready-mobile.png` | 1,934,570 bytes |

## Browser-gate execution

`scripts/wp005-browser-gate.ps1` verified only the disposable database destination, then ran the targeted Action assurance and WP-004 regression specs with `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome` against installed Chrome. It never printed database credentials. The two project runs completed **9/9**, and its artifact check confirmed all four named screenshots are non-zero. Existing governance expectations were preserved; focused assertions were added for the two screenshot-review corrections.

## Known non-blocking follow-ups

The pre-existing wordmark aspect-ratio warning and mobile hydration attribute warning (cause unconfirmed) are tracked separately in `docs/NON_BLOCKING_UI_FOLLOWUPS.md`. The Sites/Vinext build also emitted its existing Vite native config-loader advisory. None blocked WP-005 validation.

**Final verdict:** READY FOR PRODUCT OWNER REVIEW — NOT MERGED OR DEPLOYED.
