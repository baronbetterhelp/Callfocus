# CallFocus V15.29 Visual Test — Admin Save Reliability Fix

Built directly on **V15.28 Visual Test**.

## Fixes

- Restores the accidentally removed `screenshotLimits()` admin helper that caused **Save global settings** to stop before sending its request.
- Adds visible `Saving…` state and complete error handling to the global save button.
- Hardens persistent admin authentication with a signed opaque `session2:` token.
- Existing `session:` tokens remain supported and are silently upgraded after a successful remembered-login restore.
- Admin authentication can use the normal admin header or a secure same-site HttpOnly session cookie, preventing valid admin saves from incorrectly falling back to **Incorrect admin passcode**.
- Admin sign out revokes the active session and clears the secure cookie. Changing the configured admin passcode still invalidates signed sessions.
- Quick Start save now reports an expired session clearly instead of presenting it as a wrong password.

## Unchanged

V15.28 promo scheduling, dark/light theme behavior, calls, credits, payments, referrals, saved information, Quick Start content, voice notes, Recent Calls and customer authentication are otherwise unchanged.

## Build

`15.29-test`
