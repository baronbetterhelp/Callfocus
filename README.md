CallFocus V11.11

Request End improvements:
- The Request end button now produces a longer, more natural call ending.
- The ending uses the current call conversation as context.
- It acknowledges the most recent part of the conversation when appropriate.
- It gives a conversational reason for needing to leave.
- If no real reason exists in the call context, it uses a non-specific natural reason rather than inventing a specific event.
- The ending is typically 2–4 short sentences instead of an abrupt “bye” or “talk soon.”
- The graceful-close safety timeout was extended so the longer ending is not cut off.
- The same behavior also applies when low credit automatically triggers Request end.

Main changed file:
- v10.4-patch.js
