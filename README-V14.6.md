# CallFocus V14.6 — iOS Safari Navigation Stability

- Fixed the iPhone/Safari crash loop that could appear on `/credits` or other CallFocus routes after using a page and then going back.
- CallFocus page-level Back buttons no longer call the browser's `history.back()`. They now return deterministically to the CallFocus Home view and replace the current route, avoiding fragile Safari bfcache restoration.
- Retired the CallFocus service worker and clears old CallFocus service-worker/cache registrations from existing browsers. CallFocus does not need offline HTML, and removing navigation interception makes Safari tab restoration substantially simpler.
- Removed the V14.5 background service-worker update behavior. Returning to a backgrounded tab no longer mutates navigation state.
- Debounced browser `popstate` handling to prevent duplicate route application during rapid iOS back/forward events.
- Preserved direct routes such as `/credits`, `/recent-calls`, `/profile`, and the rest of the customer URLs.
- Root refresh still opens at the top front-page hero.
- Calls, credits, payments, account data, manual-payment approval, and admin behavior are unchanged.
