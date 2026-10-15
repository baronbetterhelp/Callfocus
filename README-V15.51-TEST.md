# CallFocus V15.51 Visual Test — Saved Email Draft & Clean Inbox Style

V15.51 is a targeted Admin → Email update built directly on V15.50.

## Email draft persistence
- The latest promotional email draft is now stored in the existing `CALLFOCUS_CONFIG` KV storage.
- Subject, inbox preview text, small heading, headline, message, CTA label/link, legal sender name, mailing address and test email are restored automatically when Admin → Email is reopened.
- Draft changes auto-save after editing and can also be saved immediately with the new **Save draft** button.
- Sending a test or live campaign also refreshes the saved draft.
- Recipient selections are intentionally not restored, reducing the risk of accidentally re-sending to an old custom audience.

## Cleaner normal-email presentation
- The delivered email template now uses a simpler white email layout with a compact CallFocus identity header, cleaner typography, minimal decoration and a restrained CTA.
- The Admin live preview mirrors the cleaner layout.
- Promotional unsubscribe protections remain intact, including one-click unsubscribe headers and the visible unsubscribe link.
- Gmail, Outlook and other inbox providers still control whether promotional mail appears in Primary, Promotions, Updates or another category. CallFocus does not attempt to bypass provider filtering.

## Preserved
- Resend integration, bulk recipient selection, suppression list, campaign history, customer accounts, calls, credits, payments, referrals, themes, Quick Start and all other V15.50 behavior remain unchanged.

Build/app version: `15.51-test`.
