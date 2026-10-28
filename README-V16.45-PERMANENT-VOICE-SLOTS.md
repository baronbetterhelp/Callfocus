# CallFocus V16.45 — Limited Permanent Voice Cloning

Base: CallFocus V16.44 complete package. Changes are scoped to the existing ElevenLabs-specific client/worker, an isolated booking module, voice admin settings, and the `_worker.js` route registry. **OpenAI's existing voice calls, models, prompts, endpoints, and payment systems were not modified.**

## Before enabling bookings: required setup

1. In Cloudflare **D1 > callfocus-wallet > Console**, run `permanent-voice-slots.sql` exactly once. It adds one table and two indexes and does not edit existing financial tables. Use the D1 database already bound to the Worker as `CALLFOCUS_WALLET_DB`.
2. In Cloudflare Workers > CallFocus > **Settings > Variables and Secrets**, add two **encrypted secrets** from the NEW subscribed ElevenLabs account:
   - `ELEVENLABS_PERMANENT_API_KEY`
   - `ELEVENLABS_PERMANENT_AGENT_ID`
   Do not put these in GitHub or the public website. Leave original OpenAI and historical ElevenLabs secrets unchanged. Configure this ElevenLabs agent's *prompt override, first-message override and voice override* permissions the same way you previously configured the cloned-voice agent.
3. Upload the V16.45 changes-only files to the repo, keeping their exact names, or deploy the complete website package for a fresh backup. You must preserve the existing `wrangler.jsonc` binding and KV secrets. There is no new D1 binding to add.
4. Admin > **Voice** > **Limited permanent voice slots**: set max slots (30 for an empty Creator account; 50 only if the new plan actually supports at least 50 custom voices), minimum *confirmed lifetime deposit* threshold (default ₦10,000), cloning start date, popup title/message, full-slots message, Telegram channel URL; click **Save slot settings**.
5. Turn on **Enable slot bookings** and optionally **Show booking announcement popup**. To let customers see the homepage button, keep the independent **Show “Clone your voice” on homepage** setting on.
6. To permit **creating and using** saved voices, separately turn on **Enable voice cloning** in the existing voice availability control. This can remain OFF while customers book a future date.
7. Check provider subscription and monthly voice operation limits on the new Admin > Voice panel before opening a campaign to many users.

## Customer behavior

- Eligible signed-in customers see the popup (once per session per announcement revision), with **Book slot**, slots remaining, date, and funding threshold.
- One booking per authenticated customer account. The D1 INSERT checks remaining capacity and inserts in one SQLite write statement, preventing concurrent overbooking.
- Existing reservations survive when booking availability is switched off, a manual-full switch is enabled, or the announcement popup is disabled.
- Slots are held for the customers who booked them; they are **not** automatically cancelled or transferred. There is no automatic saved-voice deletion.
- If all slots are booked, or an administrator checks **Manually mark slots as filled**, new visitors see the editable fully-booked message and a Telegram channel button when they click Clone your voice. The popup can show the same notice.
- Once booked and on/after the scheduled date (if one was set), and once cloning itself is enabled, customers may record/upload a consent-verified sample of **their own adult voice** to create exactly one permanent provider voice.
- A saved voice ID is securely linked to that account in D1 and reused by the existing **ElevenLabs-only** real-time cloned calls and cloned voice notes, without creating/deleting a voice for every call.
- Voice note speech and live agent sessions still consume normal CallFocus credits. Booking itself deducts none.
- If the provider creation returns an uncertain network/server error, the slot stays in `creating` until an administrator reconciles it, to avoid creating duplicate paid voices. If provider says verification is needed, the slot stays in `verification` for review. Do not delete or reset records blindly.

## Important limits and notes

- **Eligibility:** This build checks **total confirmed deposits recorded in customer wallet purchase history** (default ₦10,000), not the user's remaining spendable CallFocus credits. The wallet is denominated in service credits/seconds, and converting it to naira at a fixed rate would be inaccurate under custom prices. You can change the deposit threshold in Admin. If you specifically need a remaining wallet-value rule, that requires defining a business conversion policy first.
- **Provider storage:** Creator plans generally allow 30 custom voices; a 50-slot launch needs a plan with enough available custom slots. Additional voices already stored directly in the ElevenLabs account reduce real capacity. Check Admin's provider counter before opening.
- **Monthly voice operations:** Even a permanent clone consumes one provider add/edit operation on initial creation. The quota resets monthly; deleting the clone does not refund the operation.
- **New account:** Voices stored under the previous ElevenLabs account do not transfer merely because the API key is replaced. Use a fresh account **before** allowing permanent bookings and creation. Ensure your multi-account usage complies with ElevenLabs' terms.
- **Historical cleanup:** The old temporary-voice cleanup continues under the original `ELEVENLABS_API_KEY`. Existing old customer-voice purge button is hidden to prevent accidental disruption. No saved permanent voice is deleted automatically.
- The default booking settings are **OFF** after the update; new customers cannot reserve anything until you configure it.
- The Telegram channel URL defaults to `https://t.me/callfocus` as a placeholder. Replace it with your actual channel address before enabling the notice.

## Test coverage

Validated with Node syntax checks and a simulated SQLite/D1 environment: admin settings, funding threshold, slot-limit enforcement, duplicate booking, manually-full state, one successful provider creation, voice persistence/reuse and duplicate-create rejection. **Not live-tested with a paid ElevenLabs account or deployed Cloudflare D1**, so perform a controlled one-customer end-to-end test first.
