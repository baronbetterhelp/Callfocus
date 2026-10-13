# CallFocus V15.15 — Admin-Controlled Quick Start & Promo Manager

Built directly on **V15.14**.

## New Admin → Quick Start panel

The Home quick-start/help hub is now fully controlled from the admin portal. The saved settings use the existing `CALLFOCUS_CONFIG` KV global configuration, with a dedicated `/api/admin/quick-start` save path so Quick Start changes can be published without changing unrelated admin settings.

### Independent visibility controls

- Turn the built-in YouTube guide card on or off.
- Turn the Telegram channel card on or off.
- Turn the animated floating help button on or off separately.
- If every built-in/custom popup item is disabled, the Home popup does not appear.

### Popup timing

- Set how many seconds after Home opens before the popup appears.
- Set how many seconds the popup stays open before it closes/minimizes.
- Setting the disappear time to `0` leaves the popup open until the customer closes it or selects an action.
- If the floating button is disabled, closing or timing out the popup hides the hub instead of shrinking it.

### Editable built-in content

Admin can edit the popup eyebrow, main heading and intro message, plus the title, short message and destination link for both the YouTube and Telegram cards. A YouTube link that resolves to a video keeps the existing in-page floating video player.

### Custom popup messages

Admin can add up to eight custom popup cards. Each card supports:

- Independent on/off switch.
- Title.
- Short message.
- Destination link.
- Uploaded logo picture.
- Remove-logo control.
- Delete control.

Uploaded logos are resized in the admin browser before they are stored with the global KV configuration. Custom links are restricted server-side to HTTPS or same-site relative links.

## Preserved behavior

The popup remains Home-only. The floating button stays draggable with the animated ring and unread badge. When both YouTube and Telegram are enabled, their logos continue alternating. If only one built-in service is enabled, the bubble shows that service alone. If only custom items remain, the first active custom logo is used for the floating button.

No payment, referral, credit, call, voice-note, saved-information, customer-account, or admin-authentication logic was redesigned.

## Versioning

Customer/admin asset references and `/api/app-version` are updated to `15.15`.
