# CallFocus V15.65 Visual Test — iOS New-Call Screenshot Scroll Stability

Built directly on CallFocus V15.64 Visual Test.

## Change
- Fixes the iPhone/Safari issue where taking a screenshot while scrolled down inside the **Completely new call** setup could make the setup jump back to the top.
- Tracks the actual scroll position of the new-call modal and restores it after transient Safari focus, visibility, viewport-resize, pageshow, or screenshot-related viewport events.
- Does not block normal finger scrolling. A deliberate user scroll remains authoritative.
- The protection is scoped only to `#newCallModal .call-form-modal`; other pages, modals, routing, authentication, payments, credits, providers, pricing and backend configuration are unchanged.

## Build
- App/build version: `15.65-test`
