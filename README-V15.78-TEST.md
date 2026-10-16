# CallFocus V15.78 Visual Test — Auto-Fill Feedback, Finalization Resilience & Scroll Stability

Built directly on CallFocus V15.77.

## Fixes
This update is intentionally limited to the **Fill in all information automatically** screenshot-generation sheet.

- The **Generate information** button no longer looks broken when the selected screenshot count is below the admin-set minimum. It remains clickable when idle and shows a clear popup telling the customer exactly how many more screenshots are required.
- The screenshot-count check runs before the caller-detail checks so an insufficient screenshot selection always gets the correct feedback.
- The final generation step now retries temporary network/server/provider interruptions instead of immediately cancelling after all screenshot batches have already been processed. It retries only transient conditions and keeps the current progress visible if the final step still fails.
- Added iPhone/Safari scroll-position protection specifically to the auto-fill modal so taking a screenshot, returning from the image picker, or a transient viewport/focus/visibility change cannot unexpectedly snap a deeply-scrolled sheet back to the top. Normal user up/down scrolling and intentional programmatic scrolling remain allowed.

## Preserved
No changes to screenshot limits, AI model/provider, prompts, generated-field structure, pricing, credits, payments, authentication, Cloudflare bindings, KV/database structure, call behavior, Rebuild behavior, admin features, or unrelated layouts.

Build version: `15.78-test`.
