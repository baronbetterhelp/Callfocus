# CallFocus Worker V10

V10 replaces the Realtime conversation engine with **GPT-Live 1** and focuses on natural turn-taking.

## Why V10 exists
The previous Realtime setup could become too eager, overly verbose, scripted, and prone to continuing without giving the other person enough room to speak. V10 changes the voice architecture rather than adding more prompt text on top of the old behavior.

## V10 behavior
- GPT-Live 1 via `/v1/live/sessions`
- Full-duplex listening/speaking
- Strong turn-taking rules enforced server-side
- One or two short sentences per routine turn, then wait
- Explicitly forbids asking and answering its own questions
- Explicitly forbids simulating both sides of the conversation
- Explicitly yields when the other person speaks
- Does not fill ordinary silence
- Customer call context is supplied separately from behavior instructions
- Admin `Natural speech style` and `Master call rules` are loaded from Cloudflare KV for every new call
- Start Call gate remains in place
- Customer-selected call opening still works on new calls and continuity calls
- Request End uses GPT-Live instructions to produce one short natural wrap-up

## Existing Cloudflare settings remain required
Runtime secret:
- `OPENAI_API_KEY`
- `CALLFOCUS_ADMIN_PASSCODE`

KV binding:
- variable: `CALLFOCUS_CONFIG`
- namespace: your existing `callfocus-config`

## Deployment
Replace the current repository files with this complete V10 package and let Cloudflare redeploy.

Do not delete your Cloudflare runtime secrets or KV namespace.

## Important
V10 intentionally fixes the voice engine at `gpt-live-1`. The admin portal still controls server availability, male/female voice selection, speech style, master call rules, default opening behavior, and whether CallFocus normally speaks first after the customer presses Start Call.
