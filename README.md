# CallFocus V11.19

Account reliability patch for Cloudflare Workers.

Key changes:
- fixes HTTP 500 during customer account creation/sign-in on Workers Free by reducing the PBKDF2 work factor to fit the request CPU budget
- keeps accounts in the existing `CALLFOCUS_CONFIG` KV binding
- wraps account routes with JSON error reporting so failures are diagnosable instead of returning an unexplained 500 page
- adds `/api/auth/health`
- clears stale signup errors when switching to Sign in
- preserves password eye controls and Forgot password from V11.18

Upload the update files to the existing GitHub repository and let Cloudflare deploy.
