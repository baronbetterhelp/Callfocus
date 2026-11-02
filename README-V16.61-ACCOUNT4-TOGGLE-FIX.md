# CallFocus V16.61 — Account 4 activation switch persistence

## The user-reported bug

The Voice Slots admin form did not save individual switches until the bottom "Save slot settings" button was clicked. Concurrent admin refreshes repopulated every form field from the last stored KV configuration, resetting the Account 4 checkbox to OFF approximately 2–3 seconds after it was selected, before the administrator could save.

## Fix

- **Account 4 now saves immediately when switched**, without needing to scroll to the bottom. A dedicated admin-authenticated `POST /api/admin/permanent-slots/account4` endpoint persists only `pool4AcceptNew`, so unrelated unsaved changes are not included in the activation request.
- Enabling still requires a valid Account 4 subscription, available voice-creation/storage capacity and matching Agent ID. An invalid or unavailable connection returns an actionable error and leaves the previous saved state intact.
- The admin checkbox is disabled while the request is running and displays a clear "Saving", "saved", or "NOT saved" message in its own status area.
- Background refresh responses are generation-checked, so a stale response cannot overwrite a newer click. A saved revision acts as an additional guard against propagation delays.
- Unsaved edits to the other Voice Slots fields are preserved during refreshes; the normal "Save slot settings" button continues to control those fields.
- No change to Account 1–3 assignments, account capacity rules, purchases, credit deductions, voice creation, OpenAI calling logic or other systems.

## Deployment

1. Deploy the Changes Only files over the latest V16.60 source and activate the successful Cloudflare deployment.
2. Reload Admin, open Voice Slots, then select "Allow Account 4 to receive new purchases".
3. Watch for "Account 4 enabled and saved successfully". The checkbox should remain ON through refresh and reopening the panel.
4. If activation is rejected, read the status under the switch. Check the subscription, API key permissions, Agent ID and capacity before retrying.
5. To offer slots publicly, separately use the existing total capacity, manual release and global "Enable slot purchases" controls. Activating Account 4 alone does not release or charge any slots.

**SQL:** None.

## Tests

- JavaScript syntax checks for the Worker and admin script.
- `node test-account4-toggle.mjs`: confirms the setting is isolated, activation is idempotent, deactivation works, invalid Agent ID and KV write failure do not claim success, checkbox autosave persists on the client, unsaved fields survive refresh, and failures are visible.
- `node test-account4.mjs`: regression checks provider setup, verified capacity, routing and existing voice preservation.

These are local tests; live Cloudflare configuration must still be confirmed after deployment.
