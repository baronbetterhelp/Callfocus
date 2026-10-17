# ToolCart V1.7 — Header & Admin Setup Polish

## Customer UI fixes

- Makes the Home subtitle permanently visible. It no longer depends on an animation state that can be interrupted when switching tabs.
- Repositions the signed-in header as a compact transparent row instead of a large dark/sticky block.
- Reduces the ecosystem hero panel size and padding.
- Tightens spacing below the hero and between tool names and ONLINE/OFFLINE status.
- Keeps the centered V1.6 floating dock behavior.

## Admin setup improvement

- Adds a first-time administrator setup form directly on `/admin`.
- The form uses the existing secure `ADMIN_BOOTSTRAP_TOKEN` server-side bootstrap endpoint.
- The first owner admin requires a valid email and a password of at least 12 characters.
- Bootstrap remains one-time only: after any administrator exists, the backend rejects additional bootstrap attempts.

## Database

No D1 migration is required.
