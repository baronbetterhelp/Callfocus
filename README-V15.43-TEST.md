# CallFocus V15.43 Visual Test — Working Referral Signup Links

Built directly on **V15.42 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test build is explicitly promoted.

## Referral link update

- Referral Share buttons now share a real signup URL in the format `https://callfocus.link/?ref=CODE&signup=1`.
- Opening a referral link takes a signed-out visitor straight into **Create account**.
- The referral code is automatically inserted into the signup form and clearly marked as applied.
- The referral code is held in the current browser session through the email-verification step, so the referral is not lost before account creation.
- Signup falls back to the captured referral-link code if the referral field is unexpectedly blank.
- Successful account creation clears the pending referral value.
- Share labels now say **Share link** / **Share referral link**, and clipboard fallback copies the direct signup URL.
- Manual referral-code entry remains supported and server-side referral validation/reward rules are unchanged.

## Unchanged

Referral rewards remain: referred new users receive the configured signup bonus (currently 75 credits) after successful account creation with a valid code, and referrers receive the configured reward (currently 100 credits) after the referred user's first confirmed deposit. Calls, server-authoritative call credits, live redirect controls, payments, admin, saved information, themes and other customer features are unchanged.

## Build

`15.45-test`
