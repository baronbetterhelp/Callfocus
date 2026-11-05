# CallFocus V16.64 — Popup delay timing correction

Root cause: V16.63 starts the configured delay **after** the slow customer status response completes. That response queries voice-provider subscriptions and the customer wallet, so a 1-second setting could take several seconds in practice.

Fix: The new authenticated `/api/permanent-slots/popup-config` endpoint reads only saved announcement settings. The countdown starts when the page becomes ready (or when sign-in is detected), independently of external provider status calls. If full status is pending when the delay expires, the popup shows a non-purchasable preview, followed by verified details when ready. No purchase action is shown until the authoritative status loads. If the popup is dismissed it cannot reopen spontaneously on the same page load.

Existing signed-in-only, every-refresh, manually-openable behavior is retained. Supports integer delays 0–60 seconds; 0 means as soon as authorization and quick configuration have loaded, subject to normal network latency. Admin confirms the saved seconds value. The price, wallet, payments, stored voices, OpenAI voice system, and all provider operations remain unchanged. No SQL migration.
