# CallFocus V16.32 — Voice capacity / first clone guard

## Root cause
The ElevenLabs workspace has a shared custom voice quota (error 30 / 30). This quota is separate from the CallFocus customer allowance of three saved voices. A full workspace cannot create additional voices until a slot is freed or subscription capacity is increased.

## Updates
- Reads subscription voice-slot capacity using the existing server-side ElevenLabs API key. No API keys sent to browsers.
- Shows a plain CallFocus-branded availability notice before customers record/upload, while keeping existing cloned voices selectable.
- Checks shared capacity again server-side before creating a new voice. Maps provider quota errors to an understandable non-provider-branded customer message.
- Lets authenticated customers delete *only their own* saved cloned voices with explicit confirmation. This deletes the provider copy and their own KV saved entry; deletion cannot be undone.
- Includes cache-version updates in affected HTML files.

## Mandatory operator action
You must increase your workspace voice-slot capacity or deliberately delete voice(s) you are certain are no longer needed from ElevenLabs My Voices. No code can bypass the subscription quota. Do not delete voices belonging to customers without authorization. For thousands of customers, ask ElevenLabs about a suitable high-capacity/business arrangement.

## Changes unchanged
No changes to OpenAI/standard call JS, wallet charging, provider credentials, checkout or payment services.
