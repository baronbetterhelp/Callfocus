# CallFocus V16.62 — Direct public slot availability

Adds an admin-only **Slots available on website** numeric input and **Update website slots** button. Example: 120 total slots, 90 existing bookings, and 30 available publicly.

- Saves the exact remaining publicly offered count in the existing KV settings; does not require an additional D1 migration.
- The endpoint validates verified connected-account capacity and total unreserved slots, rejecting overselling; requests for 0 close public sales without affecting booked voices.
- Retains existing `releaseId` and counts prior purchases so the new quota does not reset customers or allow duplicate purchase capacity.
- Every successful purchase automatically decreases the displayed available slots through the existing D1-backed counted release.
- Does not cancel, move, refund, or delete any existing reservation or voice. The older explicit reclaim form remains separate and unchanged.
- Includes revision and generation guards against stale Safari/Admin refreshes; new JavaScript cache version.
- Nothing changed in original OpenAI voice, wallet charging, payment processors, provider credentials, or customer account settings.

## Deploy
Upload V16.62 Changes Only ZIP into the current CallFocus GitHub main branch, then activate the Cloudflare Worker deployment. In Admin > Voice > Permanent slots, confirm Account 4 is accepting purchases, enter 30 in the new input and press Update website slots. If API verification finds fewer than 30 usable slots, it will refuse the change and tell you why rather than falsely advertise 30 slots.

**SQL:** none.
