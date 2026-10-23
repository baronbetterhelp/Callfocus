# CallFocus V16.24 — announcement redesign and authoritative tariff display

Base: Complete V16.23. Update only targeted integration, customer UI, and admin pricing files.

- Branded announcement: actual existing CallFocus logo in top header; separate announcement title, content surface, clear footer. No change to existing announcement admin authoring or showing rules.
- Credit bundles: customer displays now use fresh `/api/public-config` package amounts, **saved package prices**, and minimum NGN deposit, instead of legacy hardcoded package prices. Minimum for custom credit entry is `max(300,ceil(minimumNaira/10))` because non-bundle custom credits retain the legacy ₦10-per-credit conversion. Server checkout remains the final authority.
- Admin adds cloned-voice tariff alongside standard calls, standard voice notes and video. Defaults to 150 credits/min; adjustable 1–100,000; normal calls unaffected.
- Each verified cloned call has its tariff snapshotted in its server usage record; cloned voice note consumption uses an internal server-only billing-rate override. Customer request data cannot set the billed rate.
- Voice pickers display `1 min / Nc` for normal or cloned selection; the Credits page lists all four usage rates with proportional billing.
- No changes to original OpenAI call script (`callfocus.js`), vendor API keys, checkout provider handlers, bonus calculation/settlement, or previous call configuration.

**Limitations:** Integration tests do not replace live E2E tests. Please verify a test customer on a preview with edited bundle prices, custom deposit, standard call, cloned call, cloned note, normal note, and video before promotion.
