CallFocus V11.18 — Account Repair + Email Verification Ready

What changed
- Removed the old Workers.dev account-transfer controls from the customer login/create-account screen.
- New accounts are stored in the existing server-side CALLFOCUS_CONFIG Workers KV namespace so the same login can be used on callfocus.link and other devices/browsers.
- Added an account-recovery safeguard: if a previous deployment created the KV account but failed before returning the browser session, entering the same email/password during Create account recovers and signs into that existing account instead of failing with a duplicate-account loop.
- Added password visibility eye buttons to create account, sign in and password-reset fields.
- Added Forgot password flow.
- Added optional email verification for new users with a branded CallFocus verification-code email.
- Added branded CallFocus password-reset emails.
- Password resets increment the account authentication version so older sessions are invalidated.
- Passwords remain salted PBKDF2-SHA256 hashes on the server and are never stored as plaintext.
- Added wrangler.jsonc to the UPDATE package so the CALLFOCUS_CONFIG KV binding is kept in GitHub/Cloudflare deployments.

Important account-storage fix
The V11.18 update package includes wrangler.jsonc with:
- binding: CALLFOCUS_CONFIG
- KV namespace ID: 772f9544dbb7486480e876df3a7a7d3d
- keep_vars: true

Do not remove that binding from wrangler.jsonc. This is what makes customer accounts persist across deployments and devices.

Email verification behavior
V11.18 supports Resend automatically when BOTH of these Cloudflare runtime values exist:
- RESEND_API_KEY
- CALLFOCUS_FROM_EMAIL

Recommended sender after verifying callfocus.link in Resend:
CallFocus <accounts@callfocus.link>

Until those two values are configured, account creation still works for testing and creates a server-backed account without blocking on email verification. Once both values are configured, NEW account creation automatically changes to:
1. Customer enters account details.
2. CallFocus sends a branded 6-digit verification code.
3. The code expires after 10 minutes.
4. The account is created only after the correct code is entered.

Forgot password
Forgot password uses the same verified sender. When email is configured, CallFocus sends a 6-digit password-reset code. A successful reset invalidates older authenticated sessions.

Files changed from V11.17
- _worker.js
- index.html
- v11.18-patch.js
- v11.18-patch.css
- wrangler.jsonc (included in update package to preserve the KV binding)
