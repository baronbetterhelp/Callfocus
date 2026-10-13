# CallFocus V15.31 Visual Test — Admin Customer Controls & Credit Notifications

Built directly on **V15.30 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Changes

- Added an Admin → Customers **Add balance** action with a custom credit amount.
- Admin-added credits increase call/voice-note balance without being counted as a paid Paystack/manual funding transaction.
- Added a customizable customer notification message. The default is `You received {amount} credits courtesy of Baron.` and supports `{amount}` and `{name}` placeholders.
- Added a server-backed customer notification queue. If the customer is online, CallFocus checks for new notices while the site is visible; if offline, the notice remains pending until the next signed-in load.
- Added a phone-style CallFocus heads-up banner with the CallFocus logo, app name, message, amount, and smooth slide/fade animation.
- Added a separate Admin → Customers **Delete account** action with confirmation plus exact-email typing. It removes the CallFocus customer record, saved account data, wallet, referral mappings, notification queue, account indexes and active customer sessions. Payment audit records are not rewritten.
- Existing Disable account, Unlimited access and Remove balance controls remain available.

## Build

`15.31-test`
