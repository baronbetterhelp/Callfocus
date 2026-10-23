# V16.36 — Manual Bank Transfer Then Email Confirmation (built over V16.35)

The original V16.35 email link approved payouts for future manual transfers and required a later Admin Mark Paid action. This update corrects the workflow to match the owner's requirements.

1. Customer requests cash withdrawal on the admin-selected weekday, submitting bank details.
2. CallFocus reserves that cash balance and emails the withdrawal request to the admin's chosen address.
3. Admin manually transfers money using their banking app; CallFocus NEVER triggers a bank transfer.
4. Admin opens the 48-hour one-time emailed review link. Only after the bank confirms payment, admin taps **Confirm Payment Sent**.
5. The one-time token records the request as Paid in D1; customer's dashboard shows Paid and a notification email is attempted.
6. If Resend/email fails, admin can resend the customer payment confirmation from Admin → Earn Referrals after fixing email configuration.
7. Optional: enter an actual transfer reference in the emailed review page. Do not click Confirm Payment Sent if payment has not been completed.
8. Admin retains the existing two-step Approve for transfer → Mark Paid as a fallback. Both paths send email only when status becomes Paid.

## D1 setup (unchanged from V16.35)
Create a new Cloudflare D1 database `callfocus-affiliates`, ADD binding AFFILIATE_DB to the existing `d1_databases` list in `wrangler.jsonc` (preserving CALLFOCUS_WALLET_DB), and run `affiliate-migrations/0001_affiliate_program.sql` in that database. Set the actual D1 ID; do not use a placeholder. Keep separate preview/staging D1 during testing. Deploy after the binding is configured.

## Scope
Changed `_worker.js` only to pass the existing mailer into the isolated affiliate routes; `affiliate-worker.js`, `affiliate-payout-review.html`, `affiliate-review.js`, `affiliate-admin.js`, and associated documentation. No OpenAI voice or ElevenLabs code, payment processor logic, old referral credits, wallets or price settings were modified.

## Payment confirmation and email delivery
All emails are attempted through existing Resend configuration. A confirmed payout remains Paid even if the email provider fails. Use Admin → Earn Referrals → Resend customer confirmation in that case. Do not mark a payout paid until your banking app confirms a real transfer.
