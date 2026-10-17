# CallFocus V15.76 Visual Test — New-Call Vertical-Only Scrolling

Built directly on CallFocus V15.75.

## Change
Fixed horizontal left/right panning inside the **Prepare this caller once** setup modal on iPhone and other mobile devices.

- The new-call setup scroller is now explicitly vertical-only (`pan-y`).
- Horizontal overflow is clipped at both the backdrop and modal-scroller level.
- The modal and its main form/grid/card children are constrained to the physical viewport width with `min-width: 0` / `max-width: 100%` guards.
- A small JavaScript safeguard resets any unexpected horizontal `scrollLeft` back to zero if Safari creates one during viewport changes.
- Existing vertical scrolling and the V15.65 screenshot scroll-position protection are preserved.
- The fix is scoped to the new-call setup so intentional horizontal behavior elsewhere is not changed.

## Preserved
No changes to calls, credits, payments, email, authentication, Cloudflare bindings, KV structure, pricing, AI/voice providers, or unrelated responsive layouts.

Build version: `15.76-test`.
