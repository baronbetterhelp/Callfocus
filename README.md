# CallFocus Worker V4

CallFocus V4 is a full redesign of the customer experience using the user-approved LodgeFinder graphite-black visual system as the reference: dark glass header, black/graphite surfaces, restrained CallFocus green, warm premium gold, staggered hero entrances, scroll reveals, subtle parallax and a brighter mobile drawer.

## Core customer flow

### Public home
New visitors always land on the public Home page. They are not forced into a login screen.

Account creation / sign-in is triggered only when a guest tries to:
- start a call
- open My Callers
- open Recent Calls
- open My Profile
- add a caller

### Completely new call
A new call asks for exactly these seven groups:
1. Call title
2. Name of the person being called
3. About both callers
4. Conversation dynamics
5. What today's call is about
6. Location and time zone for both callers
7. Male or female voice

A clear explanation tells customers this is the one-time setup. Future calls should be continued from Recent Calls.

### Repeat call
Recent Calls are reusable threads. Opening a previous thread shows one primary field:
- What is new for today's call?

The previous caller information, dynamics, last-used locations/time zones and voice are reused automatically. Optional sections allow the customer to edit those saved details when needed.

## Navigation
The mobile menu contains:
- account information / sign-in state
- Account settings
- Sign out
- Home
- My Callers
- Recent Calls
- My Profile
- a scrollable recent-call list ordered newest first

## Account settings
Users can delete their CallFocus account and all data saved for that local account in this prototype.

## Admin
The customer site does not contain an Admin menu item.

Admin is separate at:
- `/admin`

The admin panel controls:
- default male voice
- default female voice
- Realtime model
- master call instructions
- opening behavior
- speak-first behavior
- interruption behavior

## Realtime call controls
- Mute
- Audio mute
- Hold
- Request end
- End now

Request end asks the voice model to naturally wrap up based on that day's conversation, then closes the call after the wrap-up response finishes.

## Cloudflare deployment
This remains a Cloudflare Worker + Static Assets build.

Required Cloudflare runtime secret:
- `OPENAI_API_KEY`

If that secret is already configured on the existing `callfocus` Worker, replacing the GitHub files does not require recreating it.

## Important production note
V4 account authentication/data storage is a functional browser prototype using local storage and hashed passwords. Before public launch, move accounts, caller profiles, threads and call history to Supabase Auth + Postgres so users can access the same account across devices and so authentication is server-backed.
