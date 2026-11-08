# CallFocus V16.72 — Telegram popup message placement

Built on the complete V16.71 release.

- When cloning slots are full, move the existing administrator-configured full-release Telegram message from directly below the popup heading to directly above the **Join our Telegram channel** button.
- Avoid duplicating the message. Keep the default voice call offer, availability stats, booking window, slot pricing, wallet balance, Telegram link, and CTA behavior unchanged.
- For any other popup state (including not full or a user with an existing slot), keep the normal description beneath the heading, and hide the Telegram message placement.
- Bust only the popup client script and stylesheet asset versions to display the layout change promptly.
- No changes to OpenAI voice, clone engines, server, billing, wallet, admin, or external integrations.
