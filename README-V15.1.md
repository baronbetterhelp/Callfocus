# CallFocus V15.1 — Pearl Signature Premium Refinement

This build is a customer-facing polish pass based on V15.0.

## Visual refinement
- Refined Pearl Aurora into a more premium glass-and-pearl visual system with cleaner depth, spacing, borders, shadows and responsive behavior.
- Added a branded CallFocus page-loading experience with a safe fallback so it cannot remain stuck.
- Improved header, hero, quick tools, workspace cards, Recent Calls, Credits, Voice Notes, Live Avatar, forms, modals and footer presentation.
- Added subtle route entrance motion, touch feedback, accessible focus states and reduced-motion support.
- Kept the existing logo, overall Pearl identity and approved customer architecture.

## Customer-facing cleanup
- Removed customer-visible references to internal server state, admin speech settings and named payment/backend providers.
- Reworded payment and support copy in customer language while preserving the existing payment logic.
- Replaced the fake star-style proof line with factual product benefits.
- Added Live translation transcript as a visible customer feature.
- Added a secondary Continue a recent call CTA using the existing router.

## Safety / logic preservation
- No OpenAI, payment, wallet, account, admin, realtime call, voice-note, avatar or database endpoints were renamed.
- No secrets were added to customer files.
- Admin behavior remains separate.
