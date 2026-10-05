CallFocus V11.15 — Expanded GPT-Live voices

Changed files:
- _worker.js
- admin.js
- admin.html
- app.js
- v10.9-patch.js

Changes:
- Added additional official GPT-Live masculine voices to the admin male voice selector:
  Meridian, Vesper, Stone, Ripple, Cinder, Beacon, Tempo.
- Added additional official feminine GPT-Live voices too:
  Gleam, Willow, Quartz, Delta, Bossa.
- Added clearer regional / presentation labels in the admin dropdowns.
- Live-only voices can be selected for calls without being rejected by CallFocus validation.
- The existing admin TTS preview now explains when a selected voice is Live-only and should be tested with a short live call.
- Voice notes remain reliable: if a Live-only call voice is selected, Male voice notes fall back to cedar and Female voice notes fall back to marin.
