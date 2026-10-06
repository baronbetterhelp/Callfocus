# CallFocus V13.2 — Live Translation Transcript

Built on V13.1.

## What changed
- Replaced the in-call **More** control with **Transcript**.
- Added a floating, draggable **Call translation transcript** panel.
- GPT-Live input transcript is labeled with the person being called; GPT-Live output is labeled **Live Caller**.
- English calls appear as a live English transcript with no extra translation request.
- Non-English calls are translated into English line-by-line through an authenticated server endpoint while the call continues.
- The same Transcript button closes the panel; a close button is also available.
- The panel can be dragged anywhere on the call screen from its header.
- Translation text is not added to saved call history by this feature.

## Notes
- GPT-Live emits transcript deltas rather than a formal end-of-turn transcript event, so CallFocus groups fragments using transcript timing and short pauses.
- Non-English translation uses the existing server-side OpenAI API key and therefore can create additional API usage. English transcript display does not make translation API requests.
