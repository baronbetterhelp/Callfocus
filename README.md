CallFocus V12.7 Live AI Avatar

CallFocus V12.6 — Customer AI Voice Designer

See README-V12.6.md for this release.

# CallFocus V12.1 — Admin Customer Controls

Built on V12.0 Stabilization.

## Added
- Admin panel customer-account list loaded from CallFocus KV storage.
- Search by name, email or phone.
- Shows account status, credit balance, Paystack funding count/total, joined date and Unlimited Access status.
- Disable / enable customer accounts. Disabling increments authVersion, invalidating current sessions and blocking future sign-in until re-enabled.
- Give / revoke Unlimited Access directly from each customer row.
- Remove a customer's available balance while preserving Paystack purchase history so old transactions are not credited again by recovery.
- Existing admin unlimited-email storage remains compatible; the separate duplicate manager UI was consolidated into the customer list.

## Important
Removing a balance does not delete Paystack purchase records. This is intentional for idempotency and prevents a test transaction from being automatically recovered again.

# CallFocus V12.0 Stabilization Build

This build intentionally covers audit items 2 through 13. Server-side live-call/voice-note credit enforcement (item 1) and final unit economics (item 14) are intentionally deferred for the next step.

## Included
- Paystack checkout and DVA creation disabled server-side by default; verification, webhooks, recovery and existing balances remain active. Set `CALLFOCUS_PAYMENTS_ENABLED=true` only after Paystack activation.
- Customer CSS/JS patch chain consolidated into `callfocus.css` and `callfocus.js`.
- Major routes now have dedicated HTML documents and clean URLs instead of SPA fallback routing.
- Legacy direct signup endpoint retired; verified email signup flow remains.
- KV-backed rate limiting added to signup, sign-in, password reset, admin login and screenshot analysis endpoints.
- Public Admin footer link removed.
- Starter-credit wording now matches current email-based signup.
- Added `/privacy`, `/terms` and `/support`.
- Screenshot dynamics model switched to `gpt-6-luna` with `store:false` and reasoning effort `none`.
- Screenshot thumbnails can be removed individually; generated dynamics can be sent directly into New Call.
- New Call location suggestions expanded internationally and U.S.-only wording removed.
- Homepage call preview labeled as an example.
- Pearl theme colors aligned in the web-app manifest.

## Paystack activation
Until activation is complete, leave `CALLFOCUS_PAYMENTS_ENABLED` unset or false. When Paystack approves the business, add `CALLFOCUS_PAYMENTS_ENABLED=true` as a Cloudflare environment variable after completing the live-key/webhook checks.

## Security note
This build adds application-level rate limiting. Cloudflare Access/Turnstile can be added later as an additional dashboard-level layer without changing the current customer flow.


See README-V12.7.md for the Live AI Avatar integration and TAVUS_API_KEY setup.


## V12.8 — Stock Avatar Test Mode
See `README-V12.8.md`. Live AI Avatar now defaults to Tavus stock faces for free-plan testing before enabling paid custom selfie avatars.


## V12.9
Manual bank-transfer fallback with receipt upload, admin approval, Resend notification, and automatic server-wallet crediting. Configure it in Admin → Payments.


## V13.0
See `README-V13.0.md` for compact homepage quick tools and Live Avatar conversation setup.
