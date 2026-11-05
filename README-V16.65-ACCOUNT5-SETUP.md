# CallFocus V16.65 — Fifth voice account onboarding

The existing V16.57 D1 CHECK constraint already supports pool5. No SQL or migration should be rerun.

## Configuration

In Cloudflare Workers → callfocus → Settings → Variables and Secrets, create encrypted secrets:
- `ELEVENLABS_PERMANENT_5_API_KEY` (API key for the fifth account)
- `ELEVENLABS_PERMANENT_5_AGENT_ID` (Agent ID belonging to that fifth account)

Do not commit key values, print them to logs, or put them on public pages. The key requires subscription access, agent read access, voice creation and the calls/notes operations used by CallFocus. Use an active paid plan supporting voice cloning; only actual verified voice slots and monthly operations count.

## Activate

1. Deploy V16.65 from the Changes Only archive after confirming the V16.64 source is current. No SQL.
2. Leave Account 5 disabled until its key and Agent ID are saved as Cloudflare secrets.
3. In Admin → Voice → Limited permanent voice slots, tap **Verify Account 5 connection**.
4. Ensure agent and subscription checks pass and confirm available voice storage and monthly operations.
5. Turn ON **Allow Account 5 to receive new purchases**. It saves immediately and reports failures.
6. Increase **Total voice slots across all accounts** only to reflect real new capacity; save.
7. Set **Slots available on website** to the desired value, limited by the actual combined verified unreserved capacity. This does not cancel any booked customer.
8. Test a new 1,000-credit purchase and one voice creation on a test user, then verify both calls and voice notes remain correctly routed to the account storing that voice.

## Invariants

- Accounts 1–4 and all existing bookings/saved voice IDs remain associated with their original provider pools; no customer DB migration.
- Account 5 starts OFF for purchases. Rebalancing only moves eligible idle reservations into it once enabled and capacity-verified. Never move a saved voice or an active voice creation.
- The 1,000-credit debit, idempotent receipts, refunds/release safeguards, popup delay, original OpenAI calls and unrelated services are unchanged.
- No public-facing provider brands, internal account identifiers, credentials or API details were added.

The `.assetsignore` file also excludes server-only voice-slot source and internal README/SQL files from publicly served static assets. The Worker still bundles its imported server modules normally.
