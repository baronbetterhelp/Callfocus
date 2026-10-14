# CallFocus V15.38 Visual Test — Server-Authoritative Live Call Credits

Built directly on **V15.37 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Credit-system bug fixed

V15.37 still depended on the customer browser to reduce the live-call wallet and later sync the lower balance back to KV. A failed/backgrounded sync, a wallet refresh race, or closing the browser at the wrong time could therefore leave the authoritative server balance unchanged even though a call had been made. Admin would then show the same undeducted balance.

V15.38 moves live-call charging to the server:

- `/api/session` now requires a valid customer session and checks the authoritative server wallet before creating a live call.
- Standard-credit customers need at least 15 seconds of server-side call balance to begin. Unlimited-credit customers remain exempt.
- `/api/call-usage` now deducts elapsed live-call seconds directly from the server wallet using an idempotent per-call ledger entry.
- Call usage reports are sent every 4 seconds during an active call, plus the existing start/end/background/final reports.
- Retry of the same call usage does not intentionally double-charge because the wallet ledger stores the cumulative seconds already charged for that call.
- Admin call-usage `creditsUsed` now reflects the actual server wallet charge instead of only the browser-reported estimate.
- The client keeps a smooth visual countdown during the call but no longer mutates/syncs the persistent wallet once per second.
- Server wallet responses are applied back to the customer UI, and a server-side zero balance ends the call.
- Before starting a call the browser refreshes the authoritative wallet, so recently added/admin-gifted credits are picked up before the local pre-check.
- Full account sync now returns the authoritative wallet so server-preserved additions/deductions are immediately reconciled back to the browser.

## Scope

This update specifically hardens **live-call credit deduction** and wallet reconciliation. Existing voice-note credit behavior is unchanged in this build.

## Unchanged

Calls, voice behavior, payments, referrals, admin customer controls, notifications, Quick Start, themes, scroll animations, Recent Calls and saved information remain otherwise unchanged.

## Build

`15.38-test`
