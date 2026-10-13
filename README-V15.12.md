# CallFocus V15.12 — Cleaner Mobile Menu

Built directly on **V15.11**.

## What changed

Two items were removed from the slide-out mobile menu only:

- **Live AI Avatar** menu shortcut.
- The **Recent calls** preview block shown at the bottom of the menu.

The normal **Recent Calls** menu shortcut remains available, and the separate Live AI Avatar feature/page remains untouched elsewhere in CallFocus.

A null-safe guard was added to the mobile recent-preview renderer so removing that menu-only preview cannot trigger a JavaScript error.

## What stayed the same

Calls, credits, authentication, saved callers, full Recent Calls pages/history, Live AI Avatar functionality outside the menu, voice notes, payments, admin features, and the V15.11 quick-start help hub are unchanged.

## Versioning

Customer/admin asset references and `/api/app-version` are updated to `15.12`.
