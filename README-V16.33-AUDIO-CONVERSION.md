# CallFocus V16.33 - Voice Upload Conversion

Based strictly on the complete V16.32 ZIP.

## What changed
- Files without extensions or with generic MIME types are recognized by their true audio headers; supported files are normalized to valid names and MIME types before the existing upload request.
- A **Convert to WAV** button appears after selecting a file. Converts a file that the **current browser can decode** into 24kHz mono PCM WAV, without server requests or any additional API key.
- Show conversion progress and use the converted file with the existing Save my voice action. Source files stay in the browser until save. A recognized audio file can also be saved without conversion.
- Unsupported or undecodable recordings show an explanation plus alternatives. WAV output is restricted to 16MB and 4 minutes; input processing limited to 40MB.
- Fixes recorder/file-selection priority: a newly recorded sample clears any previously selected uploaded file.

## Technical limits
Browser native decoding depends on the audio codec. This is not a universal transcoder; e.g. certain AMR, Opus, WMA or MOV codecs may not work in Safari. If decoding fails, users can record directly or export MP3/M4A from the original recording app.

## Files modified
- elevenlabs.js, elevenlabs.css
- cf-audio-convert.js (new)
- HTML mirrors loading the clone scripts (cache updates and module loading only)

No backend, payment, wallet, OpenAI calling, account settings, or provider keys changed.
