# CallFocus V15.67 Visual Test — Universal Mobile Viewport & Typing Stability

Built directly on CallFocus V15.66 Visual Test.

## What changed
- Hardened all customer-facing pages against Safari shrink-to-fit with a viewport declaration that keeps the layout tied to the device width.
- Extended the compact responsive breakpoint from 820px to 960px so large phones in landscape and compact tablets do not fall into the desktop layout.
- Ensured touch-device inputs, textareas and selects render at a minimum 16px text size to prevent iOS Safari focus auto-zoom, including iPhone landscape widths above the old breakpoint.
- Replaced the main container viewport-width calculation with parent-width sizing and added overflow/min-width guards so customer panels, forms and modals stay inside the available screen.
- Preserved pinch zoom/accessibility and did not disable user scaling.

## Preserved
No changes to pricing, credits, payment flows, authentication, Cloudflare bindings, KV/database structure, AI providers, voice providers, call logic, Rebuild logic, or unrelated visual design.

Build/app version: `15.67-test`.
