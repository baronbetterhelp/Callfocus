# CallFocus V16.39 — Earn Referrals Dashboard Rebuild

Base: V16.38 Referral UI Polish Complete.

## What changed

The Earn Referrals customer area is now a compact SaaS-style dashboard with four horizontally scrollable tabs:

1. Overview: available balance, withdrawal shortcut, all-time earnings, count of referred customers, next eligible withdrawal-request day, pending/paid totals, and earning referral code with copy buttons.
2. Referral History: each linked signup and the number/value of verified deposits and total cash commission earned from that referral. Uses masked account identifiers to avoid exposing private customer details.
3. Withdrawals: original manual bank withdrawal request form and paginated request history with statuses.
4. Transactions: paginated chronological records of verified referral commissions and cash withdrawal activity.

## Scope and safety

Changed ONLY:
- `earn-referrals.html` — dashboard structure, tab controls, semantic markup
- `affiliate.css` — scoped customer-dashboard design, including compact responsive layouts and horizontally scrollable tab container
- `affiliate-client.js` — tab switching, financial data display, paginated customer history loading, next eligible withdrawal-request day calculation
- `affiliate-worker.js` — read-only, authenticated `/api/affiliate/history?type=referrals|withdrawals|transactions&offset=0` endpoint based on the existing D1 ledger

No changes to original OpenAI calling flows, payment integrations, wallet debit logic, earnings/commission posting or admin settings. The 30% commission is still determined by the existing admin setting and backend purchase verification. The existing payout review and manual transfer flow is unchanged. No new D1 migrations or binding changes are required.

## Deploy

Apply the changes-only ZIP contents over V16.38, replacing matching files but leaving the rest of the repository unchanged. Deploy first to a Cloudflare preview. Log in as an approved earning partner and test the 4 tabs. Test a referred new signup and verified repeat deposit to verify live commission history; this cannot be simulated with the supplied browser mock data.

## Important note about dates

The Overview displays the next **eligible day to request a withdrawal**, not a guaranteed date a bank transfer will arrive. Money is still sent manually by the administrator.

## Verification

- JavaScript syntax checks for `affiliate-client.js` and `affiliate-worker.js`
- Isolated browser testing with simulated account data at widths 320 / 390 / 768 px: tab switching, mock financial data and lists, no page-level horizontal overflow
- D1 SQL verified against schema in `affiliate-migrations/0001_affiliate_program.sql`, including two separate deposits by one invited user and a reversed payment
- Authenticated-history route tests for pagination and invalid/unauthorized requests
- Live customer records, email confirmations, real bank transfers and hosted Cloudflare deployment were not changed or tested
