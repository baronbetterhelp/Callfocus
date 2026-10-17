# ToolCart V2.5 — Admin Reflection, Responsiveness & Speed Repair

Built on top of the V2.4 multi-file product-manager build.

## Fixes
- Forces the Admin page to load the current `admin.js` and `admin.css` instead of an older browser/service-worker cached copy.
- Adds no-store cache headers for `/admin`, `/admin.html`, `/admin.js`, and `/admin.css`.
- Keeps Products inside the Tools manager with the Tools / Products switch and removes Products from the More sheet.
- Adds faster tap feedback for iPhone/Safari controls using `touch-action: manipulation` and pressed states.
- Adds short-lived in-memory GET caching and request de-duplication for Admin API reads.
- Warms commonly used Admin data in the background after login so Tools, Products, Users, Requests, and Plans reopen faster.
- Replaces the plain Loading screen with a lightweight skeleton loader.
- Adds a small V2.5 build badge under the signed-in admin identity so you can verify the deployed Admin assets are current.

## Database
No new D1 migration is required.
