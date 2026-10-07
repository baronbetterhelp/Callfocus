# CallFocus V14.5 — Home Refresh and Safari Resume Stability

- Fixed the Home page retaining/restoring a lower scroll position after a browser refresh. Refreshing `https://callfocus.link/` now opens at the top front-page hero.
- Disabled browser scroll restoration for CallFocus route documents and reasserted the root scroll position after Safari's delayed restoration pass.
- Added Safari/background-tab hardening by pausing decorative infinite animations while the tab is hidden.
- Service-worker navigation requests now bypass stale HTML cache and the Worker marks mapped customer HTML pages as no-cache/no-store.
- Added a lightweight `/api/app-version` diagnostics endpoint for future stale-build checks.
- Existing routes, account data, calls, credits, payments, and admin behavior are unchanged.
