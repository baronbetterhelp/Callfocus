# CallFocus V16.57 — Shared voice capacity and controlled releases

## Scope
- One global total of voice-cloning slots, no per-account quota input.
- Admin counts: assigned reservations, saved voice IDs, idle uncreated reservations and currently released booking availability.
- Admin can enter a fresh release quantity. The system uses unused physical capacity first. If insufficient, it reclaims *only* eligible booked/failed reservations without a voice ID; affected users lose their reservation. All reclaimed rows are written to an audit table in the same D1 transaction as deletion. Customers whose reservations were reclaimed cannot immediately book in that same release.
- Provider accounts fill in numerical order using verified physical storage and monthly creation limits. Accounts 4 through 10 are supported using new Worker API key and Agent ID secrets; if credentials are not configured those accounts are excluded. Existing saved voices ALWAYS remain assigned to their original account for calls and notes. Eligible idle reservations may move to a later connected account if the original account is exhausted.
- Public popup shows only the current admin-released availability; no account or provider identities displayed.

## Deployment order
1. **Back up** the production `callfocus-wallet` D1 database, including the active `cf_permanent_voice_slots` table.
2. Pause booking and voice creation in Admin, then execute `permanent-voice-pool-v1657.sql` ONCE in that database. Do NOT rerun V16.54.
3. Verify the active and v1656_backup table counts and saved voice IDs match. Only then deploy V16.57 Worker and assets.
4. Keep `Total voice slots` at least the number of existing reservations, for example 90 for three 30-slot accounts. New account numbers require separate provider subscriptions, API keys and agent IDs; increasing the number alone cannot create physical voice storage.
5. After testing a new booking, cloning, calls and voice notes, enable booking and cloning, then enter a fresh release quantity and confirm `RELEASE UNCREATED SLOTS`.

## Important behavior
- Starting V16.57, no new bookings are offered until Admin explicitly releases a batch; this prevents accidental overbooking.
- The admin release is **not** a silent reset: it may revoke old uncreated bookings. Admin should inform customers of a deadline or refund policy as appropriate. Saved voices, active creation attempts and verification cases are not reclaimed.
- When releasing, the system first uses capacity already free. If a release requires reclamation, it cancels the oldest eligible pending reservations, retaining a D1 audit log; it never deletes provider voice assets.
- Reassign only idle uncreated records. The account-specific provider is immutable once a voice is saved.
- Accounts 4–10 use names `ELEVENLABS_PERMANENT_4_API_KEY`, `ELEVENLABS_PERMANENT_4_AGENT_ID`, etc.; credentials must be configured privately in Cloudflare. No provider names are added to public descriptions.
- No OpenAI calling, wallet, payment, authentication, referral, or public marketing code changed.
