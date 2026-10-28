# CallFocus V16.47 — Signed-in booking announcement + opening/closing date and time

Base: V16.46.

## Changed
- Voice slot announcement appears automatically **only to authenticated customers** and reappears on every page refresh while enabled in Admin. No popup for logged-out visitors.
- On-page sign-in is detected; popup may appear after sign-in without a refresh.
- Admin > Voice > Limited permanent voice slots now has Booking opens and Booking closes date+time fields (Africa/Lagos; WAT, UTC+1). Both can be left blank to preserve manual booking controls.
- Server rejects NEW slot reservations before the opening and at/after the closing time. Existing bookings remain reserved, and saved voice creation still uses the separate cloning date and existing provider/availability controls.
- Popup displays the booking hours and shows clear not-yet-open / closed messaging. The opening and closing values are saved in the existing CALLFOCUS_CONFIG KV key; no D1 SQL changes required.
- All original OpenAI calling, models, prompts, audio, and routes are unchanged. Other financial and referral systems unchanged.

## Deployment
1. Upload the V16.47 changes-only ZIP over V16.46, preserving folder names.
2. In Admin > Voice > Limited permanent voice slots, set the opening and closing date+time and save. Do not change the independent voice-cloning on/off toggle unless intended.
3. Sign out and refresh: NO popup. Sign in and refresh: popup. Try booking before, during, and after the window on a test account.

## Notes
No new API secrets, no D1 SQL, and no Cloudflare binding modifications. Times are Nigeria time, irrespective of the visitor's local browser time. Cloudflare live deployment has not been tested.
