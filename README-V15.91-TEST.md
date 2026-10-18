# CallFocus V15.91 — Extra-Credit Bonus and Editable Credit Packages

Built directly on V15.90. Three independently saved admin controls under Payments: fixed NGN package base credits, optional percentage bonus, optional timed bonus popup. Promotion starts disabled.

Default fixed packages: ₦3,000 = 300 base credits; ₦5,000 = 500; ₦10,000 = 1,000. Minimum purchase 300 credits, 100 credits per minute and default custom-rate ₦10/credit remain. Custom credit purchases at the regular rate, except when they match a configured package's credit amount.

Bonus is snapshotted at purchase initiation and granted only following verified Paystack/KoraPay payment or manual administrator approval. Bonus amount is stored on the same purchase ledger entry as the base credits. Existing credits, admin gifts, referral credits, rate conversions, and in-progress payments remain unchanged. A unique customer heads-up notification is created on successful bonus credit grant.

Popup is optional and separate from existing quickstart promotions. Opens on Home with Deposit now link to /credits; open/close timers in seconds. Does not modify existing promo rules.

Cloudflare configuration, vars, secrets, KV ID and safe deployment command are unchanged. Test admin controls via the uploaded Cloudflare Version URL without changing shared KV before rollout.

Local syntax and mocked payment tests do not establish live provider verification.
