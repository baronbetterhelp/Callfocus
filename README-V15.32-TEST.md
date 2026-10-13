# CallFocus V15.32 Visual Test — Swipe Notifications, Gift All & Compact Customer Cards

Built directly on **V15.31 Visual Test**.

## Changes

- Customer heads-up notifications can now be dismissed by swiping left or right, in addition to tapping or automatic timeout.
- Added **Gift all customers** in Admin → Customers with a custom credit amount and custom notification message.
- Bulk gifts operate on every stored customer account, not only loaded/search-visible customers.
- Bulk gifting uses a client request ID and per-wallet deterministic ledger reference so retrying the same request does not double-credit a customer.
- Each gifted customer receives the same server-backed CallFocus notification behavior used by individual admin balance grants.
- Mobile customer cards are substantially more compact while keeping identity, status, balance, verified funding, Add balance, Disable/Enable, Unlimited, Remove balance and Delete account controls visible.

## Build

`15.33-test`
