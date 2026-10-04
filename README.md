# CallFocus Worker V3

## Customer site
`/`

## Admin site
`/admin`

V3 separates customer and admin experiences, adds account-first onboarding, saved account data on the current device, recent-call threads, caller profiles, call-specific time zones, custom/preset dynamics, and a redesigned live call screen.

## Required Cloudflare runtime secret
`OPENAI_API_KEY`

## Important production step
This build uses local browser storage for customer accounts/data so the complete product flow can be tested immediately. For true cross-device accounts and secure server-side storage, connect Supabase Auth/Postgres or Cloudflare D1 before public launch.
