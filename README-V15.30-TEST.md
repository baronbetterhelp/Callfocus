# CallFocus V15.30 Visual Test — Deploy Compile Fix

Built directly on **V15.29 Visual Test**.

## Critical fix

- Fixes the Cloudflare/Wrangler deployment failure caused by two top-level functions named `hmacSha256Hex` in `_worker.js`.
- The new admin-session signing helper is now named `adminHmacSha256Hex`, while the existing manual-payment HMAC helper keeps its original name.
- This preserves the V15.29 admin-session reliability fix without colliding with the older manual-payment security code.

## Preserved from V15.29

- Restored `screenshotLimits()` so **Save global settings** can send its request again.
- Persistent signed admin sessions and cookie fallback.
- Clearer Quick Start expired-session handling.
- V15.28 independent Popup/Floating promo scheduling and unlimited delay fields.

## Build

`15.30-test`
