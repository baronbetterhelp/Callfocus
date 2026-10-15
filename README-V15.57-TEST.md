# CallFocus V15.57 Visual Test — Referral-Link Verified Signup Repair

This build fixes the referral-link signup path so opening a shared CallFocus referral URL and having the referral code auto-filled can no longer fall through to the retired legacy `/api/auth/signup` endpoint.

## What changed

- All account creation submits now use the email-verification signup flow (`/api/auth/signup/request` then `/api/auth/signup/verify`).
- Referral links still auto-fill the referral code and open Create account normally.
- A capture-phase form guard prevents stale legacy `onsubmit` bindings from posting to the retired signup endpoint.
- Older internal `createAccount` / `createAccountServer` handlers now delegate to the canonical verified signup flow whenever it is available.
- Manual referral-code entry and normal no-referral signup continue using the same verified signup flow.
- Referral rewards and the 75-credit new-user referral bonus logic are unchanged.

No call, credit, payment, referral reward, custom voice, screenshot analysis, admin email, or other unrelated behavior was changed.

Build: `15.57-test`
