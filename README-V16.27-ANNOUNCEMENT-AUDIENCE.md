# CallFocus V16.27 — customer-only announcement cleanup

Built directly on V16.26. Targeted customer announcement fix only.

## Changes
- Removed two customer-visible internal/admin explanation messages from the announcement popup.
- Compact popup spacing while retaining the CallFocus logo, title, user-authored announcement, and Close button.
- Only show to authenticated, server-validated signed-in accounts while Home is active, including immediately after sign-in.
- Still show once on every full page refresh while enabled. Closing dismisses for that page load only. No persistent "seen" flag.
- The existing timer is not restarted by polling for public configuration; admin delay still works.
- Hide the popup if the customer signs out or leaves Home.
- Updated Admin help text. Customer HTML cache query strings updated for only the two targeted resources.

## Unchanged
- The entire original `callfocus.js`, `_worker.js`, all voice engine files, payment flows, credit accounting, tariffs, API credentials, and the bonus promotion popup are unchanged.

## Deploy and test
Use the changes-only ZIP over V16.26, preserving paths. Test an unauthenticated browser (no announcement), sign in (announcement), close (stays closed during this load), refresh (announcement returns), then disable via Admin (no announcement). Check custom opening and closing timers.
