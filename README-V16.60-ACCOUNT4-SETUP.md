# CallFocus V16.60 — Account 4 onboarding and verified overflow

## Scope

- Adds dedicated Account 4 onboarding and activation to the private Admin voice-slots screen.
- Account 4 is **disabled for new bookings by default** until the admin verifies the subscription and the correct agent, then saves the toggle.
- Reuses the existing account4/pool4 support in the V16.57 D1 constraint and the V16.59 integration functions. No SQL migration.
- Existing accounts and saved customer voices retain their provider assignment; cloned calls and notes use the key associated with the saved voice.
- Keeps the shared total capacity and 1,000-credit purchase rules from V16.58.
- New purchases and eligible uncreated booking transfers follow earlier accounts first; Account 4 is chosen only if verified capacity is available and it is enabled.
- No key/agent credential is revealed to public pages or the browser; only configuration flags are returned to the authenticated admin.

## Private setup in Cloudflare Workers

Create **secrets** (not plain environment variables) in the `callfocus` Worker:

- `ELEVENLABS_PERMANENT_4_API_KEY` — fresh API key from the new account
- `ELEVENLABS_PERMANENT_4_AGENT_ID` — its separate configured agent ID

Never paste secret values into chat or commit the actual values to GitHub. The key must have API permissions for user subscription read, agent read/signed URL and voice cloning / text-to-speech. Confirm the restrictions via the provider's dashboard/API.

## Verification and enablement

1. Confirm V16.57 and V16.58 D1 migrations are already in place; do not rerun them.
2. Leave `Enable slot purchases` OFF while preparing the account.
3. Add the two secrets in Cloudflare and deploy/activate V16.60.
4. Admin > Voice slots > Account 4 setup > Verify Account 4 connection.
5. Check account voice-storage usage, free space and agent verification. If it fails, fix the new account subscription, key permissions or agent ID.
6. Turn ON `Allow Account 4 to receive new purchases` and save. If verification fails the save is rejected; previously configured accounts remain unchanged.
7. Adjust the shared total slot limit if you actually have more capacity, and explicitly release new slots. This is not automatic because only the admin decides customer availability.
8. Test one purchase and cloned voice on a test account, then a call and a note. Confirm debit exactly once and correct account routing.

## Safeguards and limitations

- The fourth account must have an active plan supporting instant voice cloning and enough custom-voice slots and monthly creation capacity. Do not assume every account has 30 slots.
- Disabling Account 4 blocks only new bookings/eligible rebalancing into it. Its existing saved voices remain accessible.
- The 1,000-credit purchase safeguards and purchased-reservation protection are unchanged.
- Providers are not named on publicly visible pages.
- No production keys configured, no live account verification performed by this build.
- No SQL migration and no public design changes.
