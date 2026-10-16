# CallFocus V15.77 Visual Test — Mobile New-Call Layout Restoration

Built directly on CallFocus V15.76.

## Fixes
This update is intentionally limited to the **Prepare this caller once** new-call setup.

- Restores the mobile field-card arrangement that existed before the V15.67 responsive override: each step number sits at the top of its card and the field content uses the full width underneath it.
- Removes the remaining horizontal overflow source from the new-call sheet so it fits the iPhone viewport and scrolls vertically only.
- Constrains the modal, form, field content, labels, textareas, selects and location controls to the available viewport width.
- Preserves normal up/down scrolling and the existing screenshot scroll-position protection.

## Preserved
No changes to calls, Rebuild behavior, pricing, credits, payments, authentication, Cloudflare bindings, KV/database structure, AI/voice providers, admin features, or unrelated layouts.

Build version: `15.77-test`.
