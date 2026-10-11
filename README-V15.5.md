# CallFocus V15.5 — Shared Screenshot Upload Limits

V15.5 fixes the missing V15.4 admin control and replaces the one-sided auto-fill limit with one shared minimum/maximum setting for both screenshot-analysis workflows.

## Admin Portal
- AI usage now contains a prominent **Screenshot upload limits** card.
- Admin can set **Minimum screenshots** and **Maximum screenshots** from 1–50.
- Defaults remain 20 minimum / 50 maximum.
- A dedicated **Save screenshot limits** button saves the same global configuration as Save global settings.
- Invalid min > max is blocked.
- `/admin` now returns no-cache/no-store headers and admin JS/CSS cache versions are bumped so new controls do not disappear behind an old cached admin page.

## Customer behavior
The same saved minimum and maximum now apply to:
1. Fill in all information automatically.
2. Generate conversation dynamics.

Both uploaders update their explanatory text, selected counter, generate-button state, upload cap and validation from the current public configuration.

## Server enforcement
Both `/api/call-context/analyze` and `/api/dynamics/analyze` validate the configured screenshot range on batch requests and finalization. Absolute safety cap remains 50 images.

All V15.4 features remain preserved.
