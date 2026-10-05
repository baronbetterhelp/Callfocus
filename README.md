# CallFocus V11.27 Multi-Route

Built on the V11.26 feature set, preserving the V11.22 Paystack reconciliation fixes and the V11.23–V11.26 Recent Calls viewer/navigation work.

## Navigation fix

CallFocus no longer keeps every workspace screen on the same browser URL.

Each primary screen now has a stable route:

- `/` — Home
- `/voice-notes` — Voice Notes
- `/credits` — Call & Voice Credits
- `/callers` — My Callers
- `/recent-calls` — Recent Calls workspace
- `/recent-calls/<conversation-id>` — dedicated ChatGPT-style call-history viewer
- `/profile` — My Profile
- `/settings` — Account Settings
- `/admin` — existing Admin area

## Behavior

- Refreshing a route keeps the user on that same page.
- Browser Back and Forward work across CallFocus pages.
- A visible back button is available on workspace pages.
- Opening a call-history conversation gives that conversation its own URL.
- Closing the full-screen conversation returns to `/recent-calls` without deleting anything.
- Recent Calls management selection is retained through a `?thread=` URL without creating duplicate pages.
- Deep links wait for the server-backed account session to restore before loading private content.
- A root `<base href="/">` prevents nested conversation URLs from breaking scripts, CSS, icons or service-worker loading.
- No page markup was duplicated; one responsive page instance exists for each workspace view.

No Paystack, realtime voice, voice-note generation, admin-rule or account-data behavior was intentionally changed.
