# CallFocus V16.53 — Admin-controlled permanent voice bookings

Base: V16.52. Only the permanent voice slot booking feature and its admin presentation were changed.

## What changed
- Public booking availability now uses the **Admin** total booking limit, Account 1/Account 2 booking quotas, `Enable slot bookings`, `Manually mark slots as filled`, and the configured opening and closing dates.
- Booking no longer fails solely because the ElevenLabs subscription check is down, provider voice storage is already occupied, or the provider reports a smaller capacity than the admin booking quota.
- Account 1 receives new reservations up to its **admin** booking quota. Then, if the administrator enables Account 2, new reservations are assigned to Account 2 up to its configured quota. Existing reservations and the assigned provider are never moved.
- The server continues to enforce one reservation per authenticated customer, a minimum current wallet balance of 1,000 credits (or the admin-selected amount), and atomic D1 total/pool quota checks. Booking itself does not deduct any credits.
- Provider subscription, physical storage, and monthly voice-add/edit limits remain enforced **when creating the actual voice**. A booked slot is a reservation, not a guarantee that ElevenLabs can create the voice immediately.
- The admin dashboard reports **admin booking slots** separately from the provider's storage figures. Admin may stage Account 2 bookings before new API secrets are provided, but those users cannot create voices until their assigned account is configured and has real provider capacity.
- Changes to the Admin controls can reopen bookings without changes to ElevenLabs.

## Upload
1. Upload the V16.53 Changes Only ZIP over V16.52 in GitHub, preserving filenames at repository root. Do not delete other files.
2. Deploy and **activate** the successful Cloudflare Worker version. No SQL, new secrets, or other Cloudflare changes are needed.
3. In **Admin → Voice → Limited permanent voice slots**, set: Maximum combined bookings, Account 1 booking quota, Account 2 booking quota, and (if desired) Account 2 overflow. Then select Enable slot bookings, clear Manually mark slots as filled, and save.
4. Confirm the booking window is currently open (or clear opening/closing dates to control openings manually).
5. Refresh the public site while signed in and test a slot booking. It must not show a provider-based full-slots error unless the admin quotas are in fact full.

## Important operating distinction
If you configure more reservations than your ElevenLabs plan's available permanent voice storage, customers may reserve slots but be unable to create their voices immediately. Raise actual provider capacity or avoid opening more slots than you intend to service. Do not promise immediate voice creation based on booking count alone.

## Preserved
- All existing reservations, provider-account assignments, and saved voices.
- Permanent-voice creation safeguards, OpenAI default voice/calls, ElevenLabs saved call/voice note routing, wallet, payment, email and referral systems.
- No database migration required.
