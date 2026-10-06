# CallFocus V13.6 — Global Credit Rate

- Keeps the current commercial rate at **50 credits = 1 minute**.
- 300 credits = 6 minutes.
- 500 credits = 10 minutes.
- 1,000 credits = 20 minutes.
- Added one authoritative server-side `CALLFOCUS_CREDIT_POLICY` for credit/time conversion, purchase minimums, purchase step, Naira price, and starter credits.
- `/api/public-config` now publishes the pricing policy to the customer UI so visible rate, package minutes, custom amounts, starter duration, wallet credit conversions, Paystack and manual bank transfer all stay synchronized.
- Existing wallet balances are stored as seconds and are not modified by this update.
- Future rate changes only require changing `creditsPerMinute` in the global policy instead of hunting through customer pages.
