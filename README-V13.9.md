# CallFocus V13.9 – Email Payment Approval

- Manual-payment notification emails now include **Approve payment** and **Decline payment** buttons.
- Each button opens a small secure CallFocus confirmation page, so email security scanners cannot approve or decline a payment just by opening a link.
- Decision links are HMAC-signed, expire after 48 hours, and are backed by one-use KV tokens.
- Approval still uses the existing idempotent wallet purchase reference, so the same payment cannot add credits twice.
- Decline supports an optional reason and sends the existing customer decision email.
- The Admin Portal payment controls remain available as a fallback.
- No admin passcode, Paystack secret, Resend key, or other credential is embedded in the email or URL.
