# CallFocus V14.7 — Repeat-call draft stability

- Fixed the repeat-call “New conversation details” field clearing itself while the customer is typing or waiting to press Start Call.
- Periodic wallet/recovery refreshes now update credit UI without rebuilding the entire customer workspace.
- Added per-thread unsent draft protection for the repeat-call composer, including topic, optional caller/dynamics edits, locations, time zones, voice, language and opening choice.
- Draft text survives unavoidable UI redraws and Safari tab background/resume events during the session.
- A draft is cleared only after a repeat call is successfully prepared; validation errors do not erase it.
- No calling, wallet, payment, admin, or saved caller/thread data logic was otherwise changed.
