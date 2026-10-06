# CallFocus V13.7 — 100 Credits Per Minute

- Changed the global CallFocus rate to **100 credits = 1 minute**.
- Purchase prices remain unchanged: **100 credits = ₦1,000**.
- Package timing now shows:
  - **300 credits = 3 minutes = ₦3,000**
  - **500 credits = 5 minutes = ₦5,000**
  - **1,000 credits = 10 minutes = ₦10,000**
- The rate comes from the single authoritative `CALLFOCUS_CREDIT_POLICY` and is published through `/api/public-config`, so live calls, voice notes, balance conversions, package durations, custom-credit calculations, Paystack, and manual bank transfer remain synchronized.
- The frontend fallback is also 100 credits per minute, so the initial page paint matches the server rate.
- Existing wallet value is stored as seconds, so existing users keep the call time they already had. Their displayed credit number automatically converts to the new 100-credits-per-minute rate rather than cutting their remaining time in half.
- New-account starter credit remains **75 credits**, which is now **45 seconds** at the new rate.
