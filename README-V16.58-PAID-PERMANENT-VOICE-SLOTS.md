# CallFocus V16.58 — Paid permanent voice slots (1,000 credits)

## Scope
- A new permanent slot **costs 1,000 currently available CallFocus credits**. The server deducts exactly 600 wallet seconds (100 credits/minute) once after reserving a unique, protected slot purchase ID. The buyer sees the price before clicking Buy slot.
- Existing customer reservations (created before deploying V16.58) have `purchase_id = NULL` and are **not charged retroactively**.
- A new purchase stays blocked from voice creation until its wallet ledger receipt is confirmed and the D1 purchase state becomes `paid`. Interrupted purchases can be checked again using the same purchase ID. Once a charge attempt has begun, retries reconcile a confirmed receipt but never automatically attempt a second debit. Ambiguous payments are held for manual review.
- When the server detects insufficient wallet balance before any deduction, it cancels the pending new reservation.
- The Admin release action **never cancels a purchased reservation**. It may still reclaim eligible legacy reservations that were free. A refund-enabled paid cancellation workflow would need a separate implementation; do not bypass this safeguard by changing SQL manually.
- 1,000-credit price is fixed in this version. The old admin field displays it read-only.
- The customer popup, Admin message, public Features FAQ and AI discovery text are updated to accurately describe paid access without identifying underlying providers.
- The existing OpenAI calls and prompts, provider cloning engines, payment gateways, other service rates, authentication, and referrals were not modified.

## Database migration and deployment
1. **Do not deploy the new Worker before the additive `permanent-voice-purchase-v1658.sql` migration.** V16.57 D1 migration must already have completed.
2. Back up the current `callfocus-wallet` D1 database and pause new voice slot bookings/voice creation in Admin.
3. Paste the V16.58 SQL only once (the SQL has no `--` comments). This adds `purchase_id` and the `cf_permanent_voice_slot_purchases` ledger. It does not copy, delete, or rename existing bookings.
4. Verify counts of reservations and saved voice IDs remain unchanged. Confirm the new table and index exist.
5. Upload the Changes Only ZIP files to GitHub, wait for the Cloudflare build, activate the new version, and refresh Safari.
6. Test with a newly signed-in test customer: 999 credits is insufficient, 1,000 is enough, exactly 1,000 is deducted after a successful purchase, repeat tapping Buy slot does not charge twice. Verify voice creation is blocked until paid and previously booked customers are untouched.
7. After verifying real wallet balances, reopen slot purchases. If a purchase remains pending, do not manually alter balances: retry the existing purchase to reconcile an existing wallet receipt. If still pending, manually review the D1 purchase state and server wallet usage before any corrective action.

## Operational note
CallFocus's pre-existing wallet balances live in Workers KV, while voice bookings live in D1. This version adds a D1 purchase claim and idempotent wallet receipt and fails closed when verification is uncertain. D1 and KV are not a single transactional datastore: concurrent wallet writes from other services or KV delays remain a residual risk and need monitored production validation. Do not treat a successful local simulation as a production financial audit.

## Local validation
- Syntax checks on changed JavaScript.
- SQLite migration preserving old reservations.
- Simulated purchase, duplicate request, insufficient wallet, legacy booking, and protection of paid bookings from Admin release.
