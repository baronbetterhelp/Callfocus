# CallFocus V15.33 Visual Test — Upward Swipe Notification Dismissal

Built directly on V15.32 Visual Test.

## Change

- Customer heads-up notifications can now be dismissed by swiping **up**, in addition to the existing left/right swipe, tap, and timeout behavior.
- Upward dismissal uses a dedicated vertical threshold and direction check so small/diagonal movements do not dismiss accidentally.
- The notification surface captures gestures that begin on the banner, while normal page scrolling outside the banner remains unchanged.
- Existing Gift all customers, compact customer cards, individual credit controls, notifications, payments, referrals, calls, and other systems remain unchanged.

Build: `15.33-test`
