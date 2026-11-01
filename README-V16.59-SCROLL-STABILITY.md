# CallFocus V16.59 — Scroll Stability & Recent Call Draft Preservation

## Customer reports investigated
- Video 1 (9.9 s): a customer scrolls through a long new-call form and loses stable vertical placement.
- Video 2 (123.6 s): a customer moves through Recent Calls and its repeat-call form; large, repeated re-rendering disrupts their reading and field editing position.

## Fixes
- Remove deliberate Home/restore top jumps from all shared app-document entry scripts and the main client bootstrap.
- Remove scripted page and element scroll jumps from the main client, image-to-video, affiliate navigation and admin navigation; preserve native browser scroll restoration.
- Reduce recent-thread DOM replacements from background refreshes by comparing relevant state before rendering.
- Preserve existing Recent Call form values, open disclosure sections and nested scroll position when a genuine data change requires re-rendering.
- Stop auto-following transcript/chat updates while a user is reading a prior entry.
- Prevent programmatic form focus from implicitly scrolling the viewport.
- Disable global smooth-scroll CSS that amplified involuntary position changes.
- Cache-bust modified JS and CSS versions for Safari.

## Scope
Customer-page navigation and scroll stability only; no OpenAI/ElevenLabs voice behavior, billing, database schema, account authentication or payment business logic changed. No SQL migration.

## Deployment and test
Deploy Changes Only ZIP from V16.58 source. Check actual iPhone Safari scrolling on Home, New Call (long text), Recent Calls (repeat form + background sync), Voice Notes, Image to Video, Credit pages, Affiliate pages and Admin. Back/forward navigation and page restoration should retain native scroll positions. Restart Safari if a previously cached script persists. The update is locally tested, not yet production-validated.
