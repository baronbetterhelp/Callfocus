# CallFocus V16.04 — Complete Admin Account and Manual Payment Refresh (test)

Built from **V16.03 Complete**, preserving customer wallet, manual approval, KoraPay, PocketFi, Paystack, admin authentication, Resend, KV bindings, and unrelated features.

## Root causes and scoped fixes
1. `admin.js`: Customer Refresh ended after 40 × 50 = 2,000 entries, despite KV having 3,000+; now scans until `list_complete`, with cursor-loop protection, progress indication, and explicit incomplete-state warnings. Mobile page renders up to 80 visible cards at a time while searching across all loaded accounts.
2. `_worker.js`: `/api/admin/manual-payments` previously listed only the first 250 KV keys (ascending reference order), silently omitting newer submitted payments. It now supports 100-row cursor pages without changing approval/storage, retains existing approved-wallet healing.
3. `admin.js`: Admin refresh traverses all manual payment pages; pending confirmation shown first, most recent first within group, with up to 100 visible cards and a Show more control. After a manual approval, feedback appears immediately without blocking on a full 3,000+ customer re-scan; existing server-side approval/credit checks are unchanged. Counts and dashboard based on all loaded manual records, not a partial first 250. Displays progress or explicit incomplete errors.
4. `admin.html`: Added a read-only manual-payment loading status indicator. Resend email failures do not block manual receipt saving and Admin approval.
5. Cache and build references updated `16.03-test` -> `16.04-test` without unrelated logic edits.

## Testing
Syntax checks, archive integrity, mock pagination and UI source checks performed locally. No live KV or real customer accounts accessible. Deploy via `npx wrangler versions upload`; validate version URL against live read-only Admin records, confirm expected account totals and newest pending requests, approve only after bank verification. When happy promote manually.

Note: Existing KV payment record TTLs are unchanged; previously expired or deleted records cannot be reconstructed by this listing fix.
