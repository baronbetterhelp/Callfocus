# CallFocus V11.32 — Conversation Dynamics Generator

Built on V11.31.

## Added
- Replaces the home-page **Reply with voice note** launch button with **Generate conversation dynamics**.
- Signed-in users can select up to **50 conversation screenshots at once**.
- Browser prepares the screenshots and CallFocus analyzes them in small internal batches for reliability; the customer still selects and submits all images in one flow.
- Final AI output is a concise ready-to-paste **Dynamics of the conversation** summary.
- Generated dynamics can be **edited** and **copied**.
- Screenshots are not written to the CallFocus KV/account data.
- OpenAI requests use the existing server-side `OPENAI_API_KEY` and `store: false`.
- No new Cloudflare binding or secret is required.

## Privacy / safety
The generator is designed to summarize observable communication patterns and avoids speculative sensitive-trait or diagnosis-style inference.
