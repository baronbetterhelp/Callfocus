# CallFocus V12.9 — Manual Bank Transfer Fallback

This build adds a temporary manual bank-transfer payment route while Paystack activation is pending.

## Customer flow
- Enter any whole credit amount from 300 upward.
- Values below 300 are marked red and cannot proceed.
- When Paystack is unavailable and manual fallback is enabled, **Request account number** displays the configured bank details.
- Customer taps **I’ve made payment**, uploads a JPG/PNG/WebP/HEIC/PDF receipt up to 5 MB, then taps **I’ve sent the money**.
- CallFocus shows **Waiting for manual confirmation**. The customer can stay and poll status or return home.
- After admin approval, credits are added server-side and the customer wallet updates automatically.

## Admin flow
Admin → **Payments** now contains:
- Enable/disable manual fallback.
- Bank name, account name, account number, and admin notification email.
- Pending manual payment requests with receipt access.
- Approve / reject actions.

Approval is idempotent and adds the requested credits to the server wallet once. A purchase ledger entry with provider `manual_bank_transfer` prevents duplicate credits.

## Email
When a receipt is submitted, CallFocus uses the existing `RESEND_API_KEY` and `CALLFOCUS_FROM_EMAIL` settings to email the configured notification address with the receipt attached. Email failure does not lose the payment request; it remains visible in Admin → Payments.

## Paystack coexistence
Paystack remains the preferred provider. If `CALLFOCUS_PAYMENTS_ENABLED=true`, customer checkout automatically uses Paystack. Manual fallback is used only while Paystack is unavailable.

## Before enabling manual fallback
Open Admin → Payments, enter the bank details and notification email, turn on the fallback, then press **Save global settings**.
