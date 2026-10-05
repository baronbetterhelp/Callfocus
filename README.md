# CallFocus V11.5 Update

Replace/upload these files over V11.4.

Changes:
- Admin can grant/revoke unlimited credit access by customer email.
- Unlimited users are exempt from credit deduction on both live calls and voice notes.
- Customer UI shows Unlimited credit instead of a countdown.
- Includes the approved tighter hero spacing and right-aligned compact credit card.

Important prototype note: customer accounts are still browser-local. Email entitlement works for testing, but server-side customer authentication (Supabase/D1) is required before treating unlimited/paid balances as tamper-resistant production entitlements.
