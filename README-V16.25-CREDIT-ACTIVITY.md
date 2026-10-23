# CallFocus V16.25 — Recent activity in the balance card

Based on **complete V16.24**. Changes are confined to the Credits section in the nine mirrored customer HTML shells, scoped `cf-controls.css`, and the new `cf-credit-activity.js`. This allows the activity preview to work even when navigating to Credits from Home without a full reload.

- Adds a compact, read-only **Recent activity** preview below the available balance to fill the unused height opposite the service rates.
- Displays the three latest dated deposits and wallet usage entries (including grants and calls), sorted newest first.
- Retrieves verified history using existing authenticated `/api/account/data`; no new Worker API, wallet mutations, or payment changes.
- Empty and signed-out accounts have truthful fallback copy, never sample or fictional entries.
- **View all** goes to the existing Transactions & Usage page.
- Retains rate cards, wallet accounting, active calling scripts, integrations, and API keys exactly as V16.24.

## Test

Deploy to preview, sign in, visit Credits, confirm up to three recent entries and their chronological order, tap View all, and verify checkout and balance rendering remain unchanged. The status updates on page revisit, return to foreground, and periodically.
