# CallFocus V15.89 — Credits Transaction History Shortcut (Visual Test)

Based on the verified complete CallFocus V15.88 archive.

## Requested change only
- Added a small, clearly labeled **Transaction history** shortcut in the upper-right whitespace of the customer Call & Voice Credits page, across the nine customer-page templates that contain this screen.
- The shortcut uses the existing `data-route="history"` click handler to open the existing protected Transactions & Usage view. It does not create another history system, collect additional data, or change any wallet or payments logic.
- The new CSS is strictly scoped to `#page-credits` and the new shortcut class; no shared admin controls or payment button classes were touched.
- Updated only active build/cache version references from `15.88-test` to `15.89-test` in customer views, admin assets, and Worker version response; behavior is otherwise unchanged.

## Unchanged
- Admin payment availability controls, Website Maintenance Mode, Paystack, KoraPay, manual transfer, webhook verification, credits and ledgers, customer history, sessions, site bindings/secrets/deployment settings, AI/calls/voice notes, and all other functionality.
- `wrangler.jsonc` is unchanged byte-for-byte. Existing KV namespace, `CALLFOCUS_FROM_EMAIL`, and required-secret guard are preserved.

## Validation
- Local JavaScript syntax, archive integrity, file-diff, route hook and source-preservation checks.
- Static headless Chromium mobile layout check where available. Not live Cloudflare, payments, or server/API validation.

## Safe deployment
1. Upload contents of **Changes Only** ZIP to repository root `baronbetterhelp/Callfocus` `main`.
2. Keep `npx wrangler versions upload`, test the Version URL and `/api/app-version` (`15.89-test`) before promoting.
3. Verify the link opens Transactions & Usage, including when navigating from a different signed-in customer page.
