# ToolCart V1.4 — Dashboard Visual Rebuild

- Rebuilt the customer dashboard into a compact launcher-first layout.
- App tiles are now much smaller and show only icon, app name, and ONLINE/OFFLINE status.
- Replaced the oversized hero with a compact welcome panel.
- Rebuilt the floating dock to stay anchored on iPhone Safari without drifting sideways.
- Added robust page restoration when returning from external apps so Home does not appear blank.
- Changed animation defaults so Safari BFCache cannot leave panels invisible.
- Introduced a brighter Pearl-first visual system and a brighter navy Midnight theme.
- Simplified Recently Opened, Updates and subscription surfaces.
- Kept all existing backend, D1, R2, Admin, request, payment and account logic.
- Preserved the V1.3 PBKDF2 Cloudflare compatibility fix.
- Added Worker observability logging to wrangler.jsonc.
- No new D1 migration is required.
