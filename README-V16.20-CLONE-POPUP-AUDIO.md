# CallFocus V16.20 — Voice Cloning Popup & iPhone Audio Fix

Built on V16.19 complete. No modifications to callfocus.js, OpenAI calling handlers, current payment or wallet logic, or existing API secrets.

- Compact responsive voice-cloning popup. Fits the visible mobile viewport using smaller spacing and adaptive zoom; the saved-voices section is expandable. In extremely short viewports or while the keyboard is open, available space may still be limited.
- Removes named AI providers from the V16.19 customer-facing labels, button texts, call statuses, and returned voice-service errors. Internal routing, agent IDs, Cloudflare binding names and server-side technical references are intentionally preserved.
- Recognizes MP4/M4A Safari recording MIME labels with codec parameters and checks the uploaded media signature. Normalizes uploaded filename and MIME before the cloning request. Valid 21-second samples are permitted (minimum recorded duration currently 10 seconds; 1–2 minutes recommended for quality).
- Updates only the two existing customer-facing privacy and support statements to remove a named AI provider while retaining the disclosure of third-party processing.
- Cache-busts only the new elevenlabs.js and elevenlabs.css assets in HTML.

Testing: browser/UI smoke tests, JS syntax validation, mocked voice-cloning server file uploads; live upstream credential test required after preview deployment.
