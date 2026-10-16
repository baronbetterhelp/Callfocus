# CallFocus V15.72 Visual Test — Persistent Direct Message Drafts & Saved Messages

Built directly on CallFocus V15.71.

## Changes
Admin → Email → Direct customer message now keeps your work from disappearing and supports multiple reusable saved messages.

- The current direct-message draft auto-saves on the admin device while you type.
- Recipient email(s), selected saved customers, subject, message, button text and button link are restored after leaving/reopening the page on the same device.
- Added a compact Saved messages panel.
- Give a message a name and press Save message to store it for later.
- Saved messages are stored in the existing `CALLFOCUS_CONFIG` KV binding, so they can be loaded from another admin device after sign-in.
- Load selected restores the saved subject, message and CTA fields without changing the current recipient selection.
- Delete removes only the selected saved message.
- Up to 30 reusable direct-message templates are retained.

## Preserved
Direct emails remain non-promotional and continue using the existing Resend sender and admin authentication. No pricing, credits, payments, Cloudflare bindings, KV namespace, AI/voice providers, customer authentication, call logic or promotional-email behavior changed.

Build version: `15.72-test`.
