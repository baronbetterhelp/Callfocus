# CallFocus V16.71 — Default Voice CTA for Filled Cloning Slots

Base: **V16.70 Revenue/Security Complete Website**, preserved.

## Changes
- When a signed-in user sees a *filled* permanent voice-cloning release popup, a prominently styled **Use our default voice** action explains that regular calls are still available. The existing Telegram link and all cloning booking rules remain unchanged.
- Clicking the action closes the slots popup and invokes the same **Start a Call** flow already used by the home page. The call form opens directly at section **08 · Voice selection**, with the existing default Male selection active and Female available. It does **not** initiate a call or bypass required fields.
- Only for this entry route, a temporary guidance panel offers **Scroll up to fill in details** and **Fill in information automatically**. The latter launches the existing screenshot-based first-call auto-fill, which still requires user-provided materials and review. Existing My Profile prefill is retained.
- The panel disappears after the new-call form closes and does not appear when a visitor uses normal Start a Call buttons.
- The CTA is hidden when slots are not full (including the loading preview and when the user already owns a slot).
- Version-bust only `permanent-slots-client.js` and `permanent-slots.css` on all HTML entry pages; bump `VERSION` to 16.71.

## Safety
No modifications to `callfocus.js`, `_worker.js`, OpenAI voices, call instructions, payment integrations, credits/wallet, authentication, cloning backend, admin backend, or unrelated UI. Existing `/api/app-version` and admin-specific version stay matched at their original value in the V16.70 baseline to avoid admin version drift. No database migrations.

## Checks
- Syntax-check JavaScript with Node (`node --check`).
- Verify every entry page cache-busts both modified assets.
- Confirm changed-files ZIP is a clean subset of Complete website ZIP and inspect archive integrity.
- Live browser/provider testing is not claimed.
