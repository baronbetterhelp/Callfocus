CallFocus V11.13 — Per-thread call language

What changed
- Added a Call language selector only to Start a New Call.
- The selected language is saved with that call thread and reused automatically on future calls in the same thread.
- Recent-call continuation does not show a language selector.
- Added a server-side GPT-Live language lock so the live voice stays in the selected language for the entire session.
- The voice does not switch because of accent, code-switching, filler words, isolated foreign words, or because Caller B begins speaking another language.
- The selected language also controls the spoken call opening.
- Existing call threads without a stored language default to English.

Files changed from V11.12
- index.html
- app.js
- v10-patch.js
- _worker.js
