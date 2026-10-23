# CallFocus V16.26 — Announcement popup refresh behavior and bonus-style redesign

## What changed
- The announcement popup now appears again whenever the website is refreshed while the announcement is enabled.
- Closing the popup only dismisses it for the current page load; refreshing the website brings it back until the admin turns it off.
- The announcement popup has been redesigned to more closely match the bonus promotion popup, using a centered promo-style card with the CallFocus logo, stronger typography, a clear content panel, and a cleaner CTA.
- Admin copy was updated to reflect the new behavior.

## Scope
Changed only:
- `cf-controls-client.js`
- `cf-controls.css`
- `admin.html`

No changes were made to payment providers, wallet accounting, rates, call engines, or server-side pricing logic.
