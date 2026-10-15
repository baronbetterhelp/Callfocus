# CallFocus V15.59 Visual Test — Referral Signup Verification Repair

This build fixes the referral-link signup failure where a URL such as `/?ref=CFKPG7W5&signup=1` prefilled the referral code but pressing **Create account** posted to the retired legacy signup endpoint.

## Root cause
The referral-link startup code referenced `CREDIT_RULES` from a different JavaScript scope. That variable is private to the credit-wallet module. Normal signup did not execute that referral-only line, so normal signup worked. Referral signup executed it, threw a `ReferenceError`, and stopped the email-verification module before its canonical signup handler was installed. The older server-account handler then remained attached and called `/api/auth/signup`, which correctly returned the retired-endpoint message.

## Fix
- Referral UI now reads starter-credit configuration safely through `window.CallFocusCredits.rules`.
- The canonical email-verification signup dispatcher is installed before referral-link UI processing.
- Referral-link initialization is fail-safe, so a display/prefill error cannot disable verified signup.
- Referral code prefill remains intact.
- Signup continues through `/api/auth/signup/request` and `/api/auth/signup/verify`.
- Build/app version bumped to `15.59-test` for cache busting and deployment verification.

## Expected test
Open `https://callfocus.link/?ref=CFKPG7W5&signup=1`. The referral code should be prefilled. After completing the form and pressing **Create account**, CallFocus should send/open the 6-digit email verification flow instead of showing the retired-endpoint error.
