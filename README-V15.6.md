# CallFocus V15.6 — Admin Screenshot Controls Delivery Fix

- Fixes screenshot-limit controls not appearing in the live Admin Portal.
- Worker now injects the Screenshot upload limits card into `/admin` if the static admin HTML is stale or missing the card.
- `/admin`, `/admin.html`, `/admin.js`, and `/admin.css` are delivered with no-store/no-cache headers.
- Adds dedicated `/api/admin/screenshot-limits` GET/POST endpoint so the Save screenshot limits button updates only the shared generator limits.
- Shared minimum and maximum continue to apply to both first-call auto-fill and Conversation Dynamics generation.
- Admin client checks the deployed app version and performs a one-time cache-busted reload when it detects an older admin build.
- Current build: V15.6.
