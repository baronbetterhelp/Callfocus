# CallFocus V16.35 — Earn Referrals (separate cash affiliate program)

Built over V16.34. Old signup referral (75 credits for the new user, 100 one-time credits for the referrer) is unchanged. New **EARN...** codes are separate and do not automatically grant those legacy credits.

## Mandatory one-time setup for cash earnings

**The new system uses a dedicated Cloudflare D1 database, not the existing CALLFOCUS_CONFIG KV balance.** Cash balances must not be maintained by racing KV writes.

1. Cloudflare Dashboard → Workers & Pages → D1 → **Create database** named `callfocus-affiliates`. Or run `npx wrangler d1 create callfocus-affiliates`.
2. Add this binding to the `d1_databases` array in `wrangler.jsonc`, using the **real ID Cloudflare returned** (do not use a placeholder during deployment):
   ```json
   "d1_databases": [{
     "binding": "AFFILIATE_DB",
     "database_name": "callfocus-affiliates",
     "database_id": "<YOUR ACTUAL CLOUDFLARE D1 DATABASE ID>"
   }]
   ```
3. Run `npx wrangler d1 execute callfocus-affiliates --remote --file=affiliate-migrations/0001_affiliate_program.sql` (or run that SQL in D1 Console) against the newly created database. Do not execute this on any existing CallFocus wallet database.
4. Deploy changes only to a *preview/staging Worker with its own testing database first*. The worker won't change old callers, payment APIs, or the original referral reward. Without the new binding or migration, Earn Referrals returns a clear setup error and cannot produce fake cash balances.
5. Open Admin → **Earn Referrals** → configure the real payout-notification email, percentage, one weekday and minimum withdrawal amount; save. Ensure RESEND_API_KEY and CALLFOCUS_FROM_EMAIL are still configured for email delivery.
6. Sign into a test customer → My Referrals → Earn Referrals → apply. Approve in Admin, refresh customer dashboard, and inspect the separate EARN referral code.
7. Sign up a **different** test customer using `https://callfocus.link/?ref=EARN...&signup=1`, make a *genuine, small verified payment*, and inspect the original wallet ledger and the affiliate earnings ledger. A 30% rate on ₦1,000 creates a ₦300 commission; every subsequent verified deposit attributed to that account also earns. No commission is payable for unverified, failed or cancelled checkouts.
8. For withdrawal testing, set the permitted weekday to today (Africa/Lagos) and minimum <= available balance. Enter test bank info carefully. Submission reserves earnings and emails a secure **48-hour one-time review link**; opening the link only displays details. Press Approve/Reject to decide. Even approval **does not initiate a transfer**. After sending money manually, enter the real bank transfer reference via Admin → Mark Paid.

## Security and financial behavior

- Commissions and payout reserves are written in D1 atomic SQL with database-level unique payment references and a unique active withdrawal per affiliate.
- All amounts are integer *kobo*. Rates snapshot on verified payment, so later admin changes never reprice old earnings.
- **No automatic bank transfers**, no bank API hookup, and no automatic balance crediting to the CallFocus wallet.
- Payout account information appears only in the protected admin panel and time-limited secret review link, not in customer listings.
- One withdrawal **day** per week, selected by admin. Not a forced single transaction per week, although only one unfinished request can exist at a time.
- Important: Refunds/chargebacks, disputed payments, tax/KYC obligations and automatic reconciliation of provider events require additional operations before substantial cash payouts. Review these manually until those controls exist. A genuine payment failure or missing database binding never implies a commission.
- Bank detail identity/ownership is not verified automatically. Admin must verify before transferring. Security/privacy/legal requirements for money payouts should be reviewed before public launch.

## Scope of edits

- `_worker.js`: import affiliate module; recognize EARN codes at signup; add one isolated post-verification commission hook and affiliate API routes; add page routes. The original referral reward, OpenAI, ElevenLabs and payment processors are unchanged internally.
- `admin.html`: new independent Earn Referrals tab; existing admin JS untouched.
- Referral page HTML mirrors: one new stylesheet/script to inject Earn Referrals button, original referral panel unchanged.
- `wrangler.jsonc`: adds page routes only. Does **not** invent a D1 database ID or change existing bindings.
- New files `affiliate-worker.js`, `affiliate-admin.js`, `affiliate-client.js`, `affiliate-entry.js`, `affiliate-review.js`, `affiliate.css`, `earn-referrals.html`, `affiliate-payout-review.html`, and `affiliate-migrations/0001_affiliate_program.sql`.

## Important production qualification

Passed isolated SQLite/HTTP mock tests, not a live checkout or real bank payout. This package requires the binding and migration above. Don't launch financial withdrawals to real users before Cloudflare D1 preview and real provider verification tests, authorization review, privacy/KYC/legal review, and refund/chargeback handling have been completed.
