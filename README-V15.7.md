# CallFocus V15.7 — Recent Calls View All Fix

Built directly on CallFocus V15.6.

- The Home page's View all button now opens the complete Recent Calls list.
- Recent Calls navigation and `/recent-calls` show all saved conversation threads without selecting one automatically.
- On phones, the list uses the page width and normal page scrolling instead of being hidden in a drawer.
- Selecting a conversation, clicking a Home call card or opening `/recent-calls?thread=...` still opens that specific call's saved context and history.
- Existing repeat-call form values and drafts are retained when returning to the list.
- Empty accounts show the existing No recent calls yet state.
- Customer asset cache references and the app version advance to 15.7. The existing admin delivery version references advance together to preserve its cache-refresh behavior.
- V15.6 screenshot controls, payments, credits, accounts, voice notes, Telegram widget and other features are retained.

## Deploy

Upload the Changes Only files over V15.6, or use the Complete package for the entire build. Keep existing Cloudflare bindings and secrets.
