# CallFocus V11.16

Adds deletion for an individual Recent Calls conversation thread.

## New behavior
- Open any conversation under **Recent Calls**.
- Tap **Delete** in the conversation header.
- A confirmation dialog shows the exact conversation being removed.
- Confirming deletes that thread and all call history stored inside it.
- The person's reusable **My Callers** profile is intentionally kept, so a new conversation can be started later.
- An active connected conversation cannot be deleted until the call is ended.

## Files changed from V11.15
- `index.html`
- `v11.16-patch.js` (new)
- `v11.16-patch.css` (new)
