CallFocus V11.12

Fixes the End naturally control.

Changes:
- Removes the unsupported response.create request from the natural-ending flow when using client delegation.
- Uses GPT-Live session.instructions.append plus session.commentary.append instead.
- Keeps the ending prompt under the Live append limit.
- Prevents a recoverable natural-ending client-event error from being shown as “Server unavailable”.
- Keeps contextual, relationship-aware endings with an ordinary believable reason for leaving.
- Preserves automatic call closure after the spoken ending.

Update from V11.11:
- replace index.html
- add v11.12-patch.js
