# CallFocus V16.54 — Third permanent-voice account and safe reassignment

## Before deploying

1. BACK UP the existing `callfocus-wallet` Cloudflare D1 database. This is the database bound as `CALLFOCUS_WALLET_DB` and holds `cf_permanent_voice_slots`.
2. Run `permanent-voice-pool-v1654.sql` ONCE in that D1 database. Previous V16.50 migration must already have been applied. The script copies ALL 10 columns and retains the original table as `cf_permanent_voice_slots_v1650_backup`; it does not touch existing voices, wallet or affiliate tables. Verify both table counts match. If existing schema has been modified separately, inspect before applying.
3. Only after the SQL succeeds, upload V16.54 files to GitHub and deploy/activate a Worker version. The SQL is not automatically applied by deployment.
4. From the NEW paid ElevenLabs account, create an authorized agent and an API key with User subscription access, Voices write, ElevenAgents write, and TTS as needed.
5. Add encrypted Cloudflare Worker secrets `ELEVENLABS_PERMANENT_3_API_KEY` and `ELEVENLABS_PERMANENT_3_AGENT_ID` to the Worker/environment hosting CallFocus. Never commit secrets into GitHub or paste them in chat.
6. Under Admin > Voice > Limited permanent voice slots, click Refresh bookings and verify Account 3 reports CONNECTED. Set Account 3 booking quota, increase the combined maximum, enable Account 3 overflow, then Save slot settings. Use **Accept NEW bookings in Account 1/2** switches to close full accounts independently; this is especially important after reassigning pending bookings, which frees their old booking quota. Reservations continue first Account 1, then 2, then 3 based on enabled admin quotas. **The setting does not override real ElevenLabs voice-storage or monthly creation limits.**
7. To fix previously stranded reservations, under 'Move pending reservations to Account 3' choose Account 1 or 2, count 1-30, type `MOVE UNCREATED VOICES`, then click Move eligible bookings. It can move ONLY pending/failed rows with no saved voice ID; it will not move in-progress, verification or ready rows. Do not perform a move while customers might be submitting the same recordings. This function is ADMIN ONLY and requires the Account 3 API key + agent and a successful subscription check. No credits are charged or deducted.

## Behavior and scope

- `provider_pool=tertiary` routes all voice creation, cloned calls and cloned notes for assigned users to Account 3. Previously saved voices stay on their original account.
- Existing reservations and their provider assignments remain unchanged unless you explicitly move pending reservations using the new admin tool.
- Account 3 starts OFF; credentials are not included.
- No changes to OpenAI, default voices, wallets, payments, referral program, xAI Image-to-Video or other email templates.
- For users already booked beyond actual provider storage, adding Account 3 alone does NOT resolve the problem. Assign their still-uncreated bookings via the admin move tool after verifying provider capacity.
- If the Account 3 subscription reports zero free storage or monthly operations exhausted, those customers cannot create voices yet even after reassignment.
- Confirm any multiple-workspace commercial use complies with current ElevenLabs rules; do not use multiple accounts to circumvent limits.

## Test checklist

- Migration copies a saved voice with ID and a pending voice without loss.
- An Account 3 row passes the provider_pool CHECK constraint.
- Account 1 and 2 IDs remain unchanged and route with old secrets.
- Account 3 only gets new bookings after earlier account quotas are full.
- The admin move operation fails unless it is authorized and confirmed and Account 3 is configured, online and has admin room.
- Verify a new Account 3 voice, clone call, and voice note live on test account before opening bookings to customers.
