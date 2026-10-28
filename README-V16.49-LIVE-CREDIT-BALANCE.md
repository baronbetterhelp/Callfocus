# CallFocus V16.49 — Permanent Slot Booking Uses Current Available Credits

**Base:** V16.48 Credit Eligibility, including the V16.47 login and booking schedule changes.

## Actual rule
- A customer needs **at least 1,000 CURRENT unused CallFocus credits** to reserve a permanent voice slot (editable via Admin -> Voice -> Limited permanent voice slots -> Minimum available credits).
- **Historical deposits do not qualify** unless those credits are still available.
- Credits are **not charged** for booking.
- Example: current balance 600 credits, minimum 1,000 credits -> customer must add 400 more credits.
- Booking POST uses a fresh trusted server-side wallet read (`balanceSeconds` normalized) and rejects insufficient balances (HTTP 402). The popup status GET also reads this balance to provide clear up-front feedback.
- Previously booked customers keep their reservations.

## Why the old naira text could persist
V16.48 correctly implemented credit eligibility, but HTML pages still referred to the popup JavaScript with the old `?v=16.47` query. Some browser and edge caches could continue to serve V16.47's ₦10,000 deposit text. This release updates the client-script and stylesheet URLs to **v=16.49** on all customer pages, and the admin-script URL in Admin.

## Deployment
1. Upload **Changes Only** on top of your current CallFocus GitHub files, preserving all unchanged files. This includes the V16.48 module logic and the cache-busted HTML pages, so it also works over V16.47.
2. Deploy to the Cloudflare Worker/environment actually serving callfocus.link (or your preview).
3. In Admin -> Voice -> Limited permanent voice slots, set **Minimum available credits = 1000**, then **Save slot settings**.
4. Refresh the site. Check that the popup displays credits, not naira. On a user with 600 available credits it should say they need 400 more credits. If Safari still shows the old copy, close that tab and reopen the site or clear only that site's cache.
5. Check with separate accounts below and at/above the threshold.

**No new SQL/secrets.** This release does not modify the OpenAI voice/call system, ElevenLabs voice calls, wallet balances, payment processing, referrals or signup functionality. Only permanent slot booking status/UI and asset version URLs change.

**Note:** The screenshots showing ₦10,000 likely came from V16.47 or a cached V16.47 popup. This release additionally exposes the verified available balance on the modal, which is checked again at booking time.
