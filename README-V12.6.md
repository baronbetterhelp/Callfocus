# CallFocus V12.6 — Customer AI Voice Designer

Built on V12.5.

## What changed
- Replaces the customer-facing need for consent-based voice cloning with a user-owned AI Voice Designer.
- Customers can create reusable AI voice profiles from the New Call flow without uploading any audio.
- Voice profile controls:
  - Male / Female presentation
  - Accent
  - Age impression
  - Warmth
  - Energy
  - Speaking speed
  - Softness / assertiveness
  - Optional free-text voice description
- Saved AI voices sync with the CallFocus account and can be reused across devices.
- Saved AI voices can be selected for new calls, repeat calls, and generated voice notes.
- A saved voice can be edited or deleted from the Voice Designer.
- Existing Male/Female base voices continue to work unchanged.
- The admin Voice tab now explains that Male/Female are base voices used underneath customer-created AI voice profiles.
- The consent-upload cloning panel is no longer shown in the admin UI.

## How it works
This feature does not clone a real person and does not upload a voice recording. CallFocus keeps the admin-selected Male/Female base voice and sends the customer’s chosen voice-style profile into GPT-Live / voice-note delivery instructions. The profile controls accent, age impression, warmth, energy, pace and presence while preserving the selected call language.

## Safety / privacy
- Users are told that the feature creates a synthetic voice style rather than copying a real person.
- Voice profile descriptions are instructed not to imitate or claim to be a specific real person.
- Only the voice-profile settings are saved to the customer account.
