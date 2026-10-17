# ToolCart V1.2 - Temporary No-Resend Signup

## Changes
- Adds temporary server-controlled signup mode for development before Resend is configured.
- New accounts are marked verified only while `ALLOW_UNVERIFIED_SIGNUP` is `true`.
- New users are automatically signed in immediately after registration in temporary signup mode.
- Existing normal Resend verification flow remains intact and resumes when the flag is changed to `false`.
- Updated Cloudflare D1 database ID to `ef8f71eb-dd5a-41dd-b049-bfe85066aa98`.
- Updated `APP_ORIGIN` to `https://toolcart.mgt-toolcart.workers.dev`.

## Important
This mode is intended only so development/testing can continue before the final ToolCart domain and Resend sender are ready. After Resend is configured, set:

```json
"ALLOW_UNVERIFIED_SIGNUP": "false"
```

Then redeploy. New accounts will once again require email verification. Existing accounts created during temporary mode remain valid.
