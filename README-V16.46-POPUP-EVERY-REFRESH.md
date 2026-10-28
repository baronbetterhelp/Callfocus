# CallFocus V16.46 — Repeat Permanent Voice Slot Notice on Refresh

Based on V16.45. This is a client-only announcement change.

- When Admin > Voice > Show booking announcement popup is enabled, the announcement automatically opens once on each fresh page load for visitors and signed-in customers, including people with an existing booked slot or completed saved voice. Visitors must sign in to book.
- Closing it does not write any sessionStorage or localStorage suppression flag. Refreshing reopens the announcement.
- The popup remains dismissible normally, without automatic reopening during the same page session.
- The popup remains disabled when the admin announcement toggle is off.
- Booking date, capacity, funding checks, backend reservations, and existing behavior of manual full/Telegram notice are untouched.
- OpenAI calling, payment providers, user accounts, and all other voice systems are untouched.
- Changed only the popup script and its versioned HTML references to avoid stale browser caches.

Files updated: 
- permanent-slots-client.js
- callers.html
- voice-notes.html
- settings.html
- recent-calls.html
- credits.html
- index.html
- avatar.html
- referrals.html
- profile.html

No SQL, secrets, or new Cloudflare bindings are required. Upload changes-only ZIP preserving the folder structure.
