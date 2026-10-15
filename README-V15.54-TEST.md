# CallFocus V15.54 Visual Test — Caller-Focused Auto-Fill Labels

V15.54 is a targeted first-call auto-fill refinement built directly on V15.53.

## Changed

- Replaces the first auto-fill details section from **About you** to **About Caller**.
- Replaces **Your name** with **Callers name**.
- Removes the age field from this auto-fill shortcut.
- Replaces **Your job / work type** with **Callers Job or work type**.
- Renames the screenshot upload heading to **Upload Client & Callers Conversation screenshot**.
- Prefills the caller-name field from the existing “Name of the person you’re calling” field when available.
- Updates the automatic analysis flow so the supplied name and work type are treated as confirmed facts about the caller, not the CallFocus account holder/client.
- The account holder/client is now distinguished from the caller using the uploaded conversation layout and message direction, without inventing missing personal facts.

## Unchanged

- Screenshot limits and image batching.
- Generated About you / About caller / Conversation dynamics result fields.
- Saved caller information and cloud sync.
- V15.53 mobile sheet positioning.
- V15.52 custom voice editing.
- Calls, credits, payments, referrals, promotional email studio and admin behavior.

Build/app version: `15.54-test`.
