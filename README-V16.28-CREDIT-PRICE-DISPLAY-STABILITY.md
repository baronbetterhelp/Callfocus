# CallFocus V16.28 - Consistent customer credit package displays

**Base:** CallFocus V16.27 (announcement signed-in compact complete).

## Fixed
- The legacy Credits renderer and older bonus-offer code can restore static package pricing and time labels after the newer admin-controlled renderer applies the saved prices. This led to alternating ₦3,000 / ₦5,000 / ₦10,000 and admin-saved package prices on screen.
- The V16.28 client controls module now uses one authoritative price/minute rendering of the saved package settings and restores it promptly following older updates or DOM mutations. It uses idempotent text updates to avoid endless redraws.
- Corrects the custom purchase summary, minimum deposit instructions, and checkout summary after older scripts overwrite their text, while leaving the original wallet/pricing calculations intact.
- Bumps client script cache version so browsers request the repaired module.

## Files changed
- `cf-controls-client.js` only for logic.
- Cache query-string change in the nine HTML entry pages that already load the controls module.
- This README.

## Deliberately unchanged
`callfocus.js`, `_worker.js`, `elevenlabs.js`, all provider adapters, payment processing, credit ledger, package persistence, and the announcement behavior. No API values or stored prices are modified.

## Deployment
Apply this Changes Only ZIP over V16.27, maintaining directory structure. Test a Cloudflare preview with previously saved package settings and wait for the page to refresh its config before checkout. Test a real minimal purchase only after confirming the API and displayed prices match.
