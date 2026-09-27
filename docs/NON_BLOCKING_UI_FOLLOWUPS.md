# Non-blocking interface follow-ups

These items are tracked separately from the approved WP-004 scope. Neither changes the WP-004 Gate B/Gate C verdict.

| Reference | Observation | Status | Follow-up |
| --- | --- | --- | --- |
| UI-001 | Next.js logs an `atom-wordmark.png` aspect-ratio warning when one displayed dimension changes without an explicit matching auto dimension. | Open, non-blocking | Check the rendered wordmark at supported viewports, then adjust its image sizing in a separate interface maintenance change. |
| UI-002 | An unrestricted mobile browser run logged a React hydration attribute mismatch involving `caret-color: transparent` on form controls. The source has no matching style declaration and the targeted mobile tests passed. | Open, non-blocking; **cause unconfirmed** | Reproduce with a clean browser profile and inspect any browser-side styling before proposing a product change. |
