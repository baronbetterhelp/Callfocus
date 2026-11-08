# CallFocus V16.75 — Monthly subscription anchored to original booking timestamp

Based on V16.74 Complete, replacing an unshipped V16.75 draft that counted from deployment time.

## Booking-date rule
For **every** purchased/confirmed slot, whether new or old, `cf_permanent_voice_slots.booked_at` is the authoritative date. No subscription can silently restart its first 30-day period at deployment or at payment settlement. First paid-through = booked_at + 30 days; grace ends booked_at + 37 days. Booking state and voice ownership remain intact until an explicit, provider-confirmed admin release. A renewal inside the grace period extends the original 30-day billing cycle. Only a renewal later than seven days overdue, before manual release, starts a new 30-day period from the date of payment.

For slots more than 30 days old, new cloned voice access will be paused as soon as V16.75 is deployed. Those over 37 days old will be immediately eligible for **manual** release. This can disadvantage customers who were sold a permanent slot; **provide direct advance notice and review applicable consumer commitments/consent before running SQL or deploying**. No automatic credits are deducted; releasing is a separate manual confirmation.

## Safe migration sequence
1. Back up production D1/KV. Verify the active D1 database is `callfocus-wallet`.
2. Ensure V16.74 subscription tables/indexes exist. Inspect booking-date coverage via the verification SQL in the chat. Do not migrate if any `booked_at` is null/invalid.
3. Run **only** `migrations/0003_all_slot_owners_monthly_transition.sql` once. It inserts missing records or upgrades `legacy` rows. It updates legacy rows and unrenewed V16.74 active rows to the original booking date, but NEVER overwrites completed or pending renewal invoices. Unconfirmed initial purchases are excluded.
4. Run the post-migration verification query. All confirmed slots should have an `active` subscription row with the original booking and due dates; review any exceptions.
5. Deploy the updated Worker and frontend together. Test one already-booked customer, an expired customer, and a paid renewal in staging before production.

## Existing integrations
OpenAI voice and call engine, original customer wallet charging logic, provider pool allocation, existing saved voices, account-6 integration and payments remain unchanged. Do not run the V16.74 legacy-enrollment SQL again after this migration.
