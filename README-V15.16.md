# CallFocus V15.16 — Custom Promo Logo Rotation

Built directly on **V15.15**.

## What changed

Every enabled custom promo now joins the floating help-button logo rotation automatically.

- YouTube, Telegram and all enabled custom promo logos share the same rotating logo stage.
- A custom promo's uploaded logo appears in its own turn alongside the built-in logos.
- Multiple enabled custom promos each receive their own turn in the rotation.
- If a custom promo has no uploaded image, its existing initial/fallback icon is used for that turn.
- The existing animated ring continues circling the floating button continuously.
- The logo shown in the center changes every 3 seconds with the existing smooth fade/scale transition.
- If only one active item exists, its logo stays visible without unnecessary switching.
- Reduced-motion browser preferences are respected.

No Quick Start admin controls, promo links, popup timing, referrals, payments, credits, calls, authentication, saved information, or other backend behavior were changed.

## Versioning

Frontend/admin asset references and `/api/app-version` are updated to `15.16`.
