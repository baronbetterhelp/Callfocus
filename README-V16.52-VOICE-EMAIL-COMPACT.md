# CallFocus V16.52 — Compact Permanent Voice Cloning Email

**Built on V16.51.**

## Scope
- Only direct service emails with the exact subject **Update on Permanent Voice Cloning** (case-insensitive, optional final period) receive the new premium compact layout.
- All other direct customer emails, saved message content, marketing campaigns, transactional emails, and email API endpoints retain their existing behavior.
- No database migrations, settings changes, or new Cloudflare secrets are required.

## Layout
- Compact CallFocus logo/wordmark, green-and-gold accents, mobile-safe table layout.
- The **existing editable button label and URL** are displayed immediately after the greeting and first body paragraph.
- All remaining administrator-written message content remains visible underneath in a mint detail panel (nothing is discarded).
- Short emails do not gain extra filler content; brief spacing and a modest footer preserve the CTA above the fold.
- The same original plain-text message is sent, unchanged.

## Deployment
Upload Changes Only ZIP over the files from V16.51. Activate the successful Cloudflare Worker deployment. Then send a test to yourself using **Admin → Email → Direct email message** with subject **Update on Permanent Voice Cloning** and your existing CTA.

**Note:** The dedicated design is intentionally tied to the existing exact email subject, not to every email or a guessed saved-message ID. If you rename the subject, it will use the standard design unless you change the subject match.

No changes to OpenAI voice, ElevenLabs, payments, wallet, referrals, or other email templates.
