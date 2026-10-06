# CallFocus V12.5 — Consent-Based Custom Voice Cloning

Built on V12.4.

## Added
- Admin-only custom voice cloning workflow under Admin → Voice.
- OpenAI custom voice access check.
- Mandatory consent recording and matching voice sample upload.
- Exact English consent phrase shown in the admin interface.
- Consent confirmation checkbox before upload.
- Custom voice library stored in CallFocus global configuration (voice IDs and labels only; uploaded audio is not stored by CallFocus).
- Custom voices can be assigned to the customer-facing Male or Female voice slot.
- Custom voices work with GPT-Live calls and generated voice notes when OpenAI custom voice access is enabled.
- Custom voice previews use the existing admin preview player.

## Important OpenAI requirement
OpenAI custom voices are available only to eligible API customers/projects. The built-in "Check access" button reports whether the configured OPENAI_API_KEY project currently has custom voice access.

The speaker must own the voice and explicitly consent. The consent and sample recordings must be from the same person.
