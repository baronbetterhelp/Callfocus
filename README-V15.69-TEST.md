# CallFocus V15.69 Visual Test — Direct Customer Message Center

Built directly on CallFocus V15.68 Visual Test.

## What changed

- Added a separate **Direct customer message** panel inside Admin → Email.
- This panel is for non-promotional account, service, support, payment, and similar customer messages.
- The form is intentionally short: select customer(s), subject, message, optional button text, and optional button link.
- Direct messages use the existing Resend sender and existing admin authentication.
- Direct messages do not use the promotional campaign unsubscribe flow or promotional legal-address fields.
- Messages may use `{name}` personalization.
- The direct-message action is limited to explicitly selected active, verified CallFocus customer accounts. There is no “send to everyone” shortcut in this panel.
- Email providers still control final inbox/tab placement; CallFocus does not attempt to bypass spam or inbox filtering.
- Existing Promotional Email Studio remains unchanged for opted-in marketing campaigns.

## Preserved

No changes to pricing, credits, payment processing, authentication, Cloudflare bindings, KV namespace, AI providers, voice providers, call logic, or customer account structure.

## Build

`15.69-test`
