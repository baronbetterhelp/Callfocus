# CallFocus V15.49 Visual Test — Promotional Email Studio

V15.49 adds a premium promotional email studio to the private Admin Portal.

## New
- Dedicated Admin → Email tab.
- Premium reusable CallFocus promotional email template.
- Custom subject, preheader, small heading, headline, message, CTA button and destination.
- `{name}` / `{first_name}` personalization.
- Audience choice: all active verified customers or individually selected customers.
- Customer search, select-visible and clear-selection controls.
- Live email preview.
- Send-test-email workflow before bulk sending.
- Existing Resend integration is reused; no new email provider is introduced.
- Resend Batch Emails API is used in batches of up to 100 recipients.
- Resend idempotency keys reduce accidental duplicate sends.
- Promotional unsubscribe links and List-Unsubscribe / one-click headers are included.
- Customers who unsubscribe are automatically suppressed from future promotional sends.
- Disabled or unverified accounts are not targeted.
- Lightweight campaign history is stored in existing CALLFOCUS_CONFIG KV.
- Legal business/sender name and mailing address are required before promotional sending.
- Admin must confirm recipients opted in before a live campaign can be sent.

## Deliverability
The build adds standard deliverability safeguards, but no application can guarantee inbox placement. Domain authentication, sender reputation, list quality and recipient engagement still affect spam filtering.

## Preserved
Calls, credits, referrals, payments, customer data, admin customer management, Quick Start, themes, saved information, Recent Calls and all V15.48 behavior remain unchanged.

Build/app version: `15.49-test`.
