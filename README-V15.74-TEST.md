# CallFocus V15.74 Visual Test — Funding Status Filters & Bulk Direct Recipients

Built directly on CallFocus V15.73.

## Change
Admin → Email → Direct email message → Select saved CallFocus customer now makes verified payment status visible and usable for recipient targeting.

- Every saved-customer row now shows a small **Funded** or **Not funded** badge.
- Funding status uses the existing verified wallet purchase history (`wallet.purchaseCount > 0`), so courtesy/admin-gifted credits do not incorrectly count as a paid deposit.
- Added filter chips for **All**, **Funded**, and **Not funded**, with live customer counts.
- Search and funding filters work together.
- Added **Select shown** to bulk-select every customer currently matching the active filter/search.
- Added **Clear shown** to remove the currently filtered/search-matching customers from the selection.
- Individual checkboxes remain available, so after bulk selecting a group the admin can still add or remove specific customers manually.
- Existing custom email recipients remain supported and are unaffected.

## Preserved
No changes to payments, credit accounting, Resend sending rules, authentication, Cloudflare bindings, KV namespace/structure, AI/voice providers, calls, pricing, or promotional email behavior.

Build version: `15.74-test`.
