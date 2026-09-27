# QCGMS continuous delivery ledger

The programme began from approved local `main` at `2e715af5cbd70183a43a5135d2dcd1146f1e100f`. All merges below are local, non-fast-forward work-package boundaries. No remote push, Preview, deployment, production data access, or production migration is part of this ledger.

| Work package | Source SHA | Local merge SHA | Gate and migration status | Evidence |
| --- | --- | --- | --- | --- |
| WP-006 Risk Experience Simplification | `898c158b913bbc61ee5aa104d4112a00507848ef` | `c5e527dd73292b2f5afadf9201e928526cc86978` | Gate B/C PASS; no schema migration | [WP-006 report](WP-006_RISK_EXPERIENCE_SIMPLIFICATION.md) |
| WP-007 Audit Experience Simplification | `8365bd371a7a8e4c04c64ed7afcb113bbdd0aad9` | `9d97ebce381fed04e583b1c8bd97de868802bc8f` | Gate B/C and Release Manager PASS; no schema migration | [WP-007 report](WP-007_AUDIT_EXPERIENCE_SIMPLIFICATION.md) |

WP-007 used Delivery Lead, Test Engineer, Security/Tenancy, Governance/CQC, RM Advocate, Form Simplicity, Plain Language, UX, Accessibility/Mobile and Release Manager reviews. Audit current work moved 403 px earlier on desktop and 698 px earlier on mobile; nine initially visible Evidence-source controls became zero while nine required answers remained. The final full browser gate was 78 passed, four intentional skips and zero failed. After a test-only fixture isolation correction, affected visual and Audit cases passed 2/2 and 8/8; direct security/integrity passed 27/27 and assurance/reopening passed 18/18. Unit/integration passed 392/392; Prisma, TypeScript, ESLint, fresh disposable migrations, Next.js and Sites/Vinext builds passed. Existing wordmark and unconfirmed mobile hydration warnings remain non-blocking. No remote push, Preview, deployment or production access occurred.

WP-008 Governance Meeting / Review Experience is next. It must reuse the existing canonical governance information and preserve authorised human decisions.
