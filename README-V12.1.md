# CallFocus V12.1 — Admin Customer Controls

Built on V12.0 Stabilization.

## Added
- Admin panel customer-account list loaded from CallFocus KV storage.
- Search by name, email or phone.
- Shows account status, credit balance, Paystack funding count/total, joined date and Unlimited Access status.
- Disable / enable customer accounts. Disabling increments authVersion, invalidating current sessions and blocking future sign-in until re-enabled.
- Give / revoke Unlimited Access directly from each customer row.
- Remove a customer's available balance while preserving Paystack purchase history so old transactions are not credited again by recovery.
- Existing admin unlimited-email storage remains compatible; the separate duplicate manager UI was consolidated into the customer list.

## Important
Removing a balance does not delete Paystack purchase records. This is intentional for idempotency and prevents a test transaction from being automatically recovered again.
