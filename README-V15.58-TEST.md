# CallFocus V15.58 Visual Test — Credits & Referral Recovery

- Fixes the direct `/credits` / `/referrals` boot race where the referral card could remain on `Loading…` while the server account was still restoring.
- Referral loading now retries after the account-ready event and on pageshow/online.
- Payment availability now has retry + timeout handling and no longer leaves a valid payment button permanently disabled when the first public-config request is delayed or fails.
- The payment button performs a just-in-time availability refresh before opening Paystack or manual bank transfer.
- Restores the safer normal `onsubmit` binding for the verified email signup flow while preserving referral-code auto-fill.
- Existing referral rewards, payment methods, calls, credits, voice, email, and admin features are unchanged.
