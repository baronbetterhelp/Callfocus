# CallFocus V15.85 — Admin Payment Switches and Site Maintenance (Visual Test)

Based strictly on the authoritative CallFocus V15.84 complete archive.

## Changes
- Admin Payments now has independently savable Manual Bank Transfer and KoraPay visibility switches. The existing manual transfer details and review tools remain.
- Admin Dashboard adds an independently savable Website Maintenance Mode switch. Visitors see a self-contained, responsive maintenance page directly from the Worker before the homepage loads. Admin access remains available.
- The manual transfer and KoraPay switches block new payment initiations on the server when disabled and hide corresponding customer purchase buttons. Payment webhooks, verification, and previously initiated manual submissions remain accepted to safely settle existing payments. Paystack behavior is unchanged.
- Controls use the existing CALLFOCUS_CONFIG KV namespace and preserve existing config, balances, history, sessions, secrets, and bindings.
- Exact new Cloudflare asset routing only for existing public .html paths, so direct HTML visits also respect maintenance mode; wrangler required-secret protection, namespaces, vars, and deploy command remain unchanged.

## Testing/rollout
- Test on a Cloudflare Version URL, but beware: admin toggles use the same production KV as your live Worker. Activating maintenance from the Version URL can affect production immediately once the build is live.
- Test payment toggles and maintenance mode only during a controlled window, after promotion. Re-enable before leaving the admin portal.
- Existing payment completions/webhooks continue during maintenance. Do not turn maintenance on during an active call without notifying users.
- Do not edit Cloudflare secrets or change wrangler versions upload.
- Local syntax, ZIP and mock tests are not live payment/Cloudflare verification.

Version: `15.85-test`.
