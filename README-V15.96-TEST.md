# CallFocus V15.96 — Emergency Signup Email Quota Relief

**Base:** the complete CallFocus V15.95 Image to Video Integration build.

## Emergency change (only)
- New admin Dashboard section **Signup email verification** with a dedicated ON/OFF control.
- This release defaults to **email verification OFF for new signups**, as explicitly requested because Resend's daily quota is exhausted. After a tested deployment, new users can register with their existing name, email, phone and password and are signed in without a verification email. The server marks these accounts `emailVerified: false` (it never claims their email is verified).
- When Resend quota resets, in Admin Dashboard turn **Require email code when creating an account** ON, then **Apply signup setting**. New signups will return to the existing six-digit verification flow. Accounts created while OFF remain unverified; toggling ON does not retroactively verify them.
- Existing rate limiting, bot trap, password hash, duplicate-account checks and the existing referral behavior are maintained; other Resend email workflows are unchanged and may still fail when the sending quota is exceeded.
- Existing accounts, sign-in, wallet, KoraPay, manual payment, promotions, AI video, live avatar, admin capabilities, KV namespace, deployment command and required Cloudflare secrets are unchanged.

## Deployment and rollback
1. Use `npx wrangler versions upload` (do not change to `wrangler deploy`).
2. Check the Version URL `/api/app-version` returns `15.96-test` and the new admin toggle is OFF. **The preview shares production KV.** Do not use test account emails you cannot access.
3. Manually promote the tested Worker version. Then test a new account: it should register without emailing a code and return `emailVerified:false`.
4. When the quota resets, toggle ON in Admin, save, and test six-digit verification with a new test address.
5. If this update fails, roll back to the last working version. It may re-enable required email verification while Resend is limited.

## Security disclosure
Email ownership cannot be established while email verification is OFF. There is increased account impersonation and signup-abuse risk. Keep the bypass as short as possible. New accounts registered during bypass **remain unverified** after turning verification back ON; they will require a future separate ownership-verification workflow if you need to confirm them retroactively. Password-reset and outgoing email functions are not disabled.

Local-only validation; no actual Cloudflare or Resend calls performed.
