# CallFocus V16.48 — Permanent Voice Slot Booking: Credit Eligibility

Based on V16.47. Scope: limited permanent voice-slot booking only. OpenAI voice/calling, elevenlabs voice generation, payment handling, pricing, referral rules and wallet mutations unchanged.

## What changed

- Changed permanent-slot booking eligibility from **₦10,000 of lifetime confirmed deposits** to **1,000 CURRENT available CallFocus credits**.
- The popup now displays “Minimum available balance: 1,000 CallFocus credits. One permanent voice per customer.”
- Admin > Voice > Limited permanent voice slots now has an editable **Minimum available credits** setting with default **1000**.
- The server checks the authenticated customer's normalized spendable wallet balance, in seconds, at booking time: **100 credits = 60 seconds**. It does not deduct credits.
- A customer with insufficient credits sees a precise message showing the required and currently available credits.
- Existing KV settings using `minimumFundingNaira` are gracefully ignored for this new condition: existing switches, date, slot capacity, reservations and announcements remain unchanged, and the new `minimumCredits` is initialized to 1000 automatically. On next admin save the updated settings are persisted.
- Existing reservations remain unchanged; no D1 migration required.

## Deployment

1. Upload the Changes Only ZIP over your existing V16.47 GitHub repository; preserve all other files.
2. Deploy the Worker. No new database SQL, secret or binding required.
3. In Admin > Voice > Limited permanent voice slots check “Minimum available credits: 1000” and Save slot settings.
4. Test on a non-booked customer: <1,000 unused credits must be rejected, ≥1,000 unused credits can book (subject to all other booking conditions). Already-booked customers retain their slots.
5. Check popup on signed-in accounts: wording is in credits rather than naira.

**Important:** This is a minimum-current-balance check, not a requirement to spend 1,000 credits and not a lifetime purchase requirement. Booking itself costs zero credits.

Local checks cover code syntax, string replacement, wallet balance conversion and simulated booking behavior. No live Cloudflare deployment or customer wallet test was performed.
