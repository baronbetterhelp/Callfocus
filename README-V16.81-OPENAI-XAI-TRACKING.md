# CallFocus V16.81 — OpenAI and xAI in API Accounts & Billing

## New default account cards
- Six ElevenLabs cards remain unchanged with provider-reported voice/credit allowance.
- OpenAI API card: current provider-reported billing spend for today and 30 days (not remaining prepaid credit). Uses `OPENAI_ADMIN_KEY`, optional `OPENAI_BILLING_PROJECT_ID`.
- xAI (Grok) API card: provider-reported team prepaid balance using `XAI_MANAGEMENT_KEY` and `XAI_TEAM_ID`. The regular `XAI_API_KEY` cannot query this separate management endpoint.

Both appear automatically on first page load; existing D1 account tracking records remain unchanged. No manual SQL needed.

## Administration
Set these Cloudflare Worker secrets/variables if live figures are desired:
- `OPENAI_ADMIN_KEY` secret (organization Admin API key). Optional `OPENAI_BILLING_PROJECT_ID` text variable for project scope. Existing OpenAI billed-cost card uses the same key.
- `XAI_MANAGEMENT_KEY` secret (xAI Management API key with billing read permissions) and `XAI_TEAM_ID` text variable (team UUID/ID).

The existing `OPENAI_API_KEY` and `XAI_API_KEY` used for production calls and video must remain unchanged.

**Never enter secret values into the tracker notes or in this chat.** The cards show unavailable instead of fabricating balances if a key is missing, permissions are insufficient, or a provider fails. Prices and billing-renewal dates stay manually editable. A refresh does not buy credits or renew subscriptions.

## Security and deployment
- All 8 default accounts cannot be removed. Existing manually entered accounts remain intact.
- Server-only provider requests. Provider keys are never serialized to the browser.
- All changes are at repository root; no SQL file, new Worker, or payment changes.
- Upload Changes Only files to GitHub. Complete ZIP is a backup.
