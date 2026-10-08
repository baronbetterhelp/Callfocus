# CallFocus V15.2 — Dynamics Upload Stability

Built on V15.1 Telegram Channel Widget.

## Fixed
- Reduced iPhone/Safari memory pressure while selecting and analyzing large Conversation Dynamics screenshot sets.
- The 50-screenshot limit is preserved.
- Selected screenshots now use lightweight numbered file tiles instead of decoding every full-resolution image for thumbnail previews.
- The native file picker is cleared after selection so Safari does not keep an extra FileList reference in addition to the working selection.
- Analysis preparation no longer converts the original full-resolution file to Base64 before resizing.
- Each screenshot is decoded and compressed one at a time, then its temporary image/canvas resources are released immediately.
- Analysis images are capped at a 1600 px longest edge and compressed as JPEG before upload, preserving readable conversation text while greatly reducing request size and memory use.
- Mobile/iPhone-sized sessions use smaller 4-image analysis batches; larger screens retain 6-image batches.
- Small browser yields were added between image preparation and batches so Safari can reclaim memory and keep the UI responsive.
- Dynamics finalization now safely accepts the additional summaries created by smaller mobile batches.
- Individual source screenshots above 20 MB are rejected before decoding to prevent pathological memory spikes.
- Asset query versions were advanced to V15.2 so browsers do not keep the older memory-heavy JavaScript/CSS cached.

## Preserved
- Existing 50-image Conversation Dynamics workflow and detailed final output.
- V15.1 home-page Telegram promo and draggable Telegram button.
- Pearl Aurora design.
- Calls, voice notes, saved callers, recent calls, credits, payments, authentication, admin portal, worldwide location search, and existing responsive behavior.
