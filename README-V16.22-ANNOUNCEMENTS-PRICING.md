# CallFocus V16.22 — announcements, deposit controls, service rates, voice feedback, badges

**Base:** V16.21 Voice Popup Complete. Intended for use with the *existing* configured Cloudflare Worker and existing KV binding `CALLFOCUS_CONFIG`. The complete ZIP preserves all other files. The changes-only ZIP contains only files which differ from V16.21 plus this document.

## Customer announcements
- **Admin → Payments → Announcement popup** has a heading, message (plain text, safe from HTML injection), a button label, opening delay, optional auto-close interval, and a separate enable/disable toggle.
- Save persists to `CALLFOCUS_CONFIG` key `cf:announcement:v1` via authenticated `/api/admin/cf-feature-controls`. The separate public GET `/api/cf-feature-controls` returns only sanitized announcement and rate information, never secrets.
- An enabled announcement shows on Home to customers with an existing session, once per announcement revision within that browser session. Saving, including simply enabling/disabling, generates a new revision. Announcement and bonus-credit promotion remain independent and can overlap if both are enabled.

## Credit packages and minimum deposit
- Admin → Payments → Credit packages now has editable **naira prices and base credits** for each of the 3 displayed packages. Each package needs a distinct price and a distinct base-credit quantity. The editable *Minimum deposit amount (₦)* is validated server-side before starting any payment checkout.
- All payment providers continue using existing verified checkout and settlement. Existing pending payments retain their original quoted price and credited quantity. Original payment-webhook secrets and handlers are untouched.
- Custom credit purchases still have a separate original minimum of **300 credits** (the pre-existing wallet restriction). Setting a lower naira deposit threshold **does not** create a new below-300-credit purchase option: admins may also lower the *price of the 300-credit package* to allow a lower-value top-up. The amount and credit value are deliberately separate.

## Usage tariffs
- Admin → Payments → Credits per service lets you save voice calls, voice notes, and Image to Video prices in **credits per minute**, billed proportionately for measured seconds.
- Live call wallet charges and voice-note wallet charges apply the configured rate on the backend without replacing the original OpenAI voice code or changing the existing call setup. The wallet uses canonical integer units (100 credits/min = 60 wallet seconds/min), so fractional second-equivalent charges round **up to a wallet unit**. On an active call the recorded rate is retained for that call; historic wallet purchases are untouched.
- Image to Video automatically calculates the 10- and 15-second package costs from the new rate after the admin saves service tariffs; any existing Image to Video job retains its snapshotted rate. If tariffs have not been saved yet, the existing 10/15-second prices and controls remain active. After saving a master rate, the master service-rate control has priority over the older Image-to-Video 10/15-second cost inputs.
- Other site functions without existing usage-based wallet billing (for example, free conversation-dynamics generation or the separate live-avatar provider) are **not assigned a new debit route** by this version.
- **Verify custom rates on a preview before promoting.** Changing rates on an existing balance may change how long customers can use their current credit balance; test insufficient funds and session end behavior with a dedicated test account.

## Voice cloning message and badges
- The previously reserved empty status area initially displays the list of supported audio types, and then replaces it with the latest recording/upload/saving/error feedback.
- Unsupported file selections and provider audio-format rejection produce a visible temporary red error notice listing: MP3, M4A/MP4, WEBM, WAV, OGG, AAC, FLAC. This does not upload unsupported files.
- Removed "New" badges from Image to Video and Live AI Avatar quick actions (on every mirrored customer page). Only the "Clone your voice" home button gets the new animated red **HOT** tag. Reduced-motion preferences are respected.

## Verification and deployment
- JavaScript syntax checks passed for the changed scripts; Worker mocked request tests passed for admin saves and public config; pure-function tests passed for minimum deposit, package pricing, per-second tariff calculation, video tariff conversion, and announcement settings.
- `callfocus.js`, `elevenlabs-worker.js`, `admin-video.js`, and `image-video.js` are byte-for-byte unchanged from the V16.21 original ZIP.
- **Live provider calls and deposits were not tested**, because Cloudflare secrets and merchant sandbox accounts are not available locally. Upload changes-only while preserving directory paths or upload the complete ZIP to a **preview first**. Do not promote until test purchases, bonus offers, voice notes, live calls, and image-to-video wallet deductions pass.
