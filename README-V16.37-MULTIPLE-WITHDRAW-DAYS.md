# CallFocus V16.37 — Multiple Withdrawal Days

Built from **V16.36 D1 Connected**. Changes limited to the Earn Referrals schedule controls and logic.

## Before deploying (required)
1. Open **Cloudflare → D1 → callfocus-affiliates → Console**.
2. Execute `affiliate-migrations/0002_multiple_withdraw_days.sql` once (safe to repeat). The existing selected day is retained.
3. Upload V16.37 changes-only files over V16.36 D1 Connected, preserving paths, then preview.
4. Open **Admin → Earn Referrals**. Tick multiple days and click **Save partner settings**.
5. On an approved test account, confirm the dashboard lists the saved days and requests are only allowed on checked Nigeria-local weekdays.

## Why a new table?
The original `affiliate_settings.weekday` column has a constraint permitting only one day, 0–6.
A small separate table stores a seven-bit selection mask without replacing that legacy column or risking other settings.
The old day is preserved automatically, and if the migration is missing the customer read path falls back to that old day. The admin refuses new multi-day saves until setup is run.

## Changed
- `admin.html`: seven multi-select checkboxes instead of dropdown.
- `affiliate-admin.js`, `affiliate-client.js`: save and display multiple days, show correct availability.
- `affiliate-worker.js`: server-side checks and atomic settings save.
- `affiliate.css`: compact responsive weekday choices.
- `earn-referrals.html`: cache references.
- `affiliate-migrations/0002_multiple_withdraw_days.sql`: repeatable D1 migration.

No changes to call providers, checkout integrations, balances, payout approval, or the existing referral-credit system.
