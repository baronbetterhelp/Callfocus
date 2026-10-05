CallFocus V11.10

Fixes:
- Fixed pasted/typed “New conversation details” disappearing shortly after entry.
- Root cause: the unlimited-credit entitlement refresh was re-rendering the entire workspace after its server check, rebuilding the Recent Calls composer.
- Entitlement refresh now updates credit UI only, without rebuilding call forms.
- Added an in-memory draft safeguard for the Recent Calls conversation-details box.
- Removed the large empty strip above the footer on the Recent Calls continuation page.
- Mobile Recent Calls now uses normal page flow instead of a fixed-height nested scroller.

Changed/added files:
- index.html
- v11.5-patch.js
- v11.10-patch.css
- v11.10-patch.js
