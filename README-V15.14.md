# CallFocus V15.14 — Referral Rewards

Built directly on **V15.13 — Opaque Mobile Menu Panel**.

## Referral signup

- Every new signup now includes an optional **Referral code** field.
- The former 75-credit starter bonus is now referral-only. A new account receives **75 free credits** when it is created with a valid referral code. No deposit is required for the referred user's 75-credit bonus.
- A signup without a referral code starts with zero free starter credits. Existing customer balances are not changed or converted.
- Referral links use `?ref=CODE` and automatically prefill the referral field.

## Referrer reward

- Every customer has a personal referral code generated automatically by the server. Existing customers receive a code the first time the referral area is loaded.
- The referrer receives **100 credits** only after the referred customer makes their **first confirmed deposit**.
- Confirmed Paystack payments and approved manual bank transfers qualify.
- The reward is recorded with a stable per-invitee ledger reference so retries and duplicate payment callbacks do not intentionally award the same referral twice.

## Customer UI

- The Credits page now includes a **Refer & earn** card with the customer's code, copy/share controls, and a My Referrals shortcut.
- The mobile menu and desktop account dropdown now include **My Referrals**.
- `/referrals` shows total referrals, deposited referrals, total credits earned, the referral code/link, and referral activity with waiting/earned status.

## Backend

- Added `/api/referrals` for authenticated referral-code creation, statistics, referral activity, and wallet refresh.
- Referral ownership and invitee records use the existing `CALLFOCUS_CONFIG` KV namespace. No new Cloudflare binding is required.
- Referral rewards are added to the existing shared call/voice-note wallet and increment wallet revision so normal server-wallet conflict protection applies.

## Versioning

Customer/admin asset references and `/api/app-version` are updated to `15.14`.
