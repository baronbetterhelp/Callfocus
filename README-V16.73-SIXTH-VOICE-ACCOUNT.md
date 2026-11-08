# CallFocus V16.73 — Voice Account 6 (Pro $99) preparation

Built from V16.72 Complete Website. **NOT activated or deployed**; no credentials are included.

## Purchase and connect

1. Create your own new ElevenLabs account at https://elevenlabs.io and subscribe to **Pro, $99/month** (plus any applicable tax). ElevenLabs presently advertises 160 total saved custom voice slots, 600,000 monthly credits and 290 monthly voice operations. Limits may change: verify the dashboard after purchase. A PVC slot is a separate concept from 160 custom voice storage slots.
2. Create a new agent in ElevenLabs Agents in the new account, matching your existing CallFocus agent behavior, and copy its Agent ID. Reusing an Agent ID from another account will fail verification; no existing agent is copied automatically.
3. Under ElevenLabs Developers → API Keys, create an API key with permissions to read subscription/workspace information, verify agents, create instant voice clones and use agents/TTS. Choose the appropriate permissions and quota. **Do not paste the key in chats, commit it, or put it in browser code.**
4. Cloudflare → Workers & Pages → CallFocus Worker → Settings → Variables and Secrets: add encrypted secret `ELEVENLABS_PERMANENT_6_API_KEY` and encrypted secret `ELEVENLABS_PERMANENT_6_AGENT_ID`. Deploy/refresh Cloudflare secrets according to the dashboard prompt.
5. Deploy V16.73 with the Complete Website or Changes Only ZIP to your existing project, using the existing Worker and bindings. This is a prepared code archive, not a deployment.
6. Admin → Voice → Limited permanent voice slots → **Verify Account 6 connection**. Confirm active subscription, storage, voice-operation headroom and matching Agent ID. Leave Account 6 OFF until all checks pass, then turn on **Allow Account 6 to receive new purchases**. This saves separately.
7. Adjust shared **Total voice slots across all accounts** only to reflect verified capacity, preserving existing bookings. To sell any new slots, set **Slots available on website** to the intended amount. New bookings allocate to Accounts 1–5 first, then Account 6.
8. Test one new 1,000-credit booking, clone, cloned call and voice note. Do not change OpenAI default voices.

## Guarantees / implementation

- Existing accounts and saved voices are not transferred, deleted or rewritten.
- Account 6 begins OFF and remains unavailable to the booking/rebalance path until explicitly activated.
- Added independently authenticated admin route `/api/admin/permanent-slots/account6`, safe activation toggle, capacity/agent verification and status. Generic voice-pool/agent routing already supports `pool6`.
- Global capacity and release counts do **not** auto-increase with the purchase. No SQL schema change is needed since existing D1 allowed pool6.
- Original OpenAI voice engine, existing ElevenLabs agents, user wallet credits and purchase logic, popup, and all other app features are untouched.

**Important:** ElevenLabs Pro includes 160 custom *storage* slots, not 160 Professional Voice Clone slots, and monthly voice-operation limits also apply. Actual available capacity may be lower. The account must be paid, configured, and verified in production before it can receive customer bookings.
