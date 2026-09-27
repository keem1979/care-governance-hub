# WP-008 — Governance Meeting / Review Experience

**Branch:** `wp-008-governance-meeting-review` from local `main` `ae2499d305e1a82d9b5a4e3596bf067a78357b6a`.
**Boundary:** fictional data in disposable `127.0.0.1:5432/care_governance_hub_test` only. No production access, remote push, Preview or deployment. No schema change or WP-008 migration.

## What changed

Meeting detail now begins with **What needs attention**, a direct next-action link and **Current work**. The agenda, recorded decisions, formal minutes, agreed Actions, linked Evidence and approval remain on the main page. Scheduling context, attendance, prior Actions and secondary review notes remain available in a collapsed supporting section. The record-completeness percentage no longer leads the page or implies assurance.

The existing edit form remains available. Direct Agenda, Minutes and Approval links take the RM to the relevant section. People and prior Actions, secondary assurance topics, and Evidence selectors start collapsed. The client no longer asks the user to choose another person's account or type an approval date. Restricted users see only authorised service locations in the selector; an organisation-wide choice is not offered to them. An approval transition remains an explicit human choice; the server records the signed-in approver and time. Approved minutes are read-only through ordinary edit. Failed saves focus the error, and archive/restore errors display to the user.

The canonical meeting, Action and Evidence records remain unchanged. The API scopes linked Action and Evidence reads and writes by tenant and location; rejects forged or unavailable prior Actions and Evidence; blocks Action extraction from archived, cancelled or undecided meetings; protects agenda items with linked Actions or controlled decisions; and guards approval and archive transitions. Users restricted to a location cannot create, edit, approve, archive or restore an organisation-wide meeting. A conditional agenda-item claim rolls back a losing concurrent Action extraction instead of creating a duplicate canonical Action. Approval history is attributed in ActivityLog. No change converts meeting completeness into verification, effectiveness, closure or regulatory compliance.

## Measured RM burden

These are control and navigation counts from the prior approved form and the rendered WP-008 form, not inferred time savings. The specialist's baseline inventory found five expanded form sections with about 35 scalar controls, alongside the people, Action and Evidence lists. WP-008 keeps required meeting inputs and governance decisions; it changes when supporting controls appear.

| Measure | Before | After |
| --- | ---: | ---: |
| Visible direct route from meeting detail to Minutes | 0 | 1 **Write minutes** link |
| Supporting control groups initially expanded in edit | 3 | 0 (three native disclosures) |
| Client-entered approval identity/date controls | 2 | 0 (signed-in actor and server date) |
| Client-selected record status for explicit approval | 1 | 1 |
| Detail-page completeness score before work | 1 | 0 |

The authenticated direct-link check measured the Minutes target 234 px from the top of the desktop viewport after navigation (document scroll position 3,879 px); the Chromium and mobile tests assert the target lands within 400 px of the viewport top. This is navigation distance evidence, not a time-saving claim.

## Gate B — Engineering evidence

| Check | Result |
| --- | --- |
| Unit/integration suite | PASS, **425/425** across 79 files at final code. |
| Targeted meeting security tests | PASS, **29/29**; includes five restricted-location write negatives and a concurrent extraction test that failed before the fix. |
| TypeScript, ESLint, Prisma validation | PASS through `npm.cmd run check` at final code. |
| Next.js production build | PASS, 149 static pages at final code. |
| Sites/Vinext production build | PASS at final code, with existing Vite and route-classification advisories. |
| Schema | No WP-008 migration. |

## Gate C — Authenticated rendered evidence

Focused Playwright on installed local Chrome passed **Chromium 2/2** and **mobile 2/2** after the final security and selector corrections. The first case creates a fictional meeting through the UI, confirms the immediately visible work and direct Minutes route, checks the supporting section is collapsed, confirms the Minutes target is in view, checks no horizontal overflow, and verifies archived detail has no active edit action. The second signs in as a location-restricted RM, confirms the organisation-wide option is absent, and checks a forged organisation-wide POST is rejected with HTTP 400. Both projects captured the detail and edit form:

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Meeting detail | `outputs/WP-008_GATE_C/final-v2/wp008-meeting-experience-m-61b2d-ing-context-stays-available-chromium/wp008-meeting-detail-chromium.png` | `outputs/WP-008_GATE_C/final-v2/wp008-meeting-experience-m-61b2d-ing-context-stays-available-mobile/wp008-meeting-detail-mobile.png` |
| Direct Minutes edit | `outputs/WP-008_GATE_C/final-v2/wp008-meeting-experience-m-61b2d-ing-context-stays-available-chromium/wp008-meeting-edit-chromium.png` | `outputs/WP-008_GATE_C/final-v2/wp008-meeting-experience-m-61b2d-ing-context-stays-available-mobile/wp008-meeting-edit-mobile.png` |

All four files exist and are nonzero. A separate authenticated local manual pass created, updated and approved fictional minutes through the browser: create POST 201, edit PATCH 200, approval actor and date displayed, edit link removed after approval. Manual draft screenshots are `outputs/WP-008_GATE_C/manual-desktop-meeting.png` and `outputs/WP-008_GATE_C/manual-mobile-meeting.png`. The manual pass also verified page load, network idle, no error overlay and no browser console error. The automated browser spec covers the draft-to-archive path; approval and security negatives are covered separately by targeted tests and the manual check.

## Specialist verdicts and known advisories

| Lens | Verdict |
| --- | --- |
| RM Advocate, UX Designer, Form Simplicity, Plain Language | PASS for reviewed rendered desktop/mobile scope: next work and direct Minutes route appear before supporting detail. |
| Accessibility/Mobile | PASS for labelled controls, native disclosures, direct anchor and mobile overflow check. Independent screen-reader audit was not performed. |
| Governance QA / CQC-style | PASS for reviewed code scope: decisions, minutes, approval and extracted Actions remain distinct and attributed; controlled decisions block archive/restore. |
| Security/Tenancy | PASS: restricted org-wide writes rejected, scoped Action/Evidence reads and writes enforced, concurrent Action extraction cannot create a second linked Action. |
| Test Engineer | PASS for focused browser gate, including the real restricted-location negative. Approval and other tenant boundaries remain in targeted route tests and the manual approval check. |
| Release Manager | READY: final code passed 425 unit/integration tests, 29 meeting security tests, Prisma/TypeScript/ESLint, both builds, and final authenticated Chromium/mobile journeys (4/4); no schema migration or unresolved High/Critical blocker. |

Existing non-blocking advisories: the wordmark image aspect-ratio warning, unconfirmed mobile hydration attribute warning, and Sites/Vinext build advisories. The assistant avatar overlaps a small part of the mobile attention panel but not the primary action link in the reviewed capture. None is represented as a WP-008 assurance decision.

**Current verdict:** READY FOR PRODUCT OWNER REVIEW / authorised local non-fast-forward merge. No remote push, Preview, deployment or production access occurred.
