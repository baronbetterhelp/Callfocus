# CallFocus V16.1 — Mobile New-Call Safe Area

- Moves the Completely New Call sheet below the iPhone/Android system status area on mobile and installed web-app layouts.
- Keeps the close button fully visible and tappable instead of allowing the time, Dynamic Island/status icons, or battery indicator to cover it.
- Matches the intended floating-sheet appearance with a visible gap above the rounded modal.
- Constrains the sheet height to the remaining viewport so the form itself remains scrollable and the bottom controls remain reachable.
- Uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` with practical fallbacks for browsers/webviews that report zero insets.
- No call logic, form data, credits, payments, authentication, locations, or admin behavior changed.
