# CallFocus V16.83 — Correct available-credit tracking

Root-level update based on V16.82. This update affects only the private admin provider billing tracker.

## Why the balances differ

- xAI `GET /prepaid/balance` exposes the **posted prepaid ledger**. This may be higher than xAI Console's current spendable credits while the billing period is still in progress. Never label this as the live spendable balance.
- Now also request `GET /postpaid/invoice/preview` with the existing Management key, using **read-only GET**. When valid `coreInvoice.prepaidCredits.val` (inverted signed USD cents) and `coreInvoice.prepaidCreditsUsed.val` (nonnegative USD cents) are available, display **estimated current remaining = (-prepaidCredits - prepaidCreditsUsed) / 100**. Also show the posted ledger and period usage independently. This is an estimate and may differ from Console. Do not conflate invoice amount payable with prepaid usage.
- If the preview is invalid, unauthorized or unavailable, show only the labeled **posted ledger**, explicitly **not** the currently available balance. Never substitute zero or fabricate the missing estimate.
- OpenAI's official organization Costs API returns spend and does **not** expose remaining prepaid balance. Show a direct link to the OpenAI Platform billing overview and an optional administrator-entered manual balance, prominently marked **not live**. Do not guess the remaining amount from 30-day spending.

## Safety and deployment

Only `cf-api-account-tracker-worker.js`, `cf-api-accounts-admin.js`, `admin.html`, `VERSION` and this README change. Existing secret names, customer wallet, OpenAI realtime calls, ElevenLabs pools, KoraPay, xAI inference, D1 migrations and subscription logic remain untouched. Both new xAI calls are strictly read-only and use the current management key.

Upload root-level changes only to GitHub, commit, then open Admin → API Accounts & Billing → Refresh All. Compare the estimate with the same team's xAI Console credits. An accurate match is **not guaranteed** because the readings come from separate provider accounting surfaces. No SQL or new Cloudflare secrets are needed.
