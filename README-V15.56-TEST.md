# CallFocus V15.56 Visual Test — Caller Age Restored

Current test build: `15.56-test`

This build restores the caller age field to the First-call Auto-fill workflow while preserving the V15.55 inline screenshot replacement and post-generation action flow.

## Changed

- `About Caller` now includes:
  - Callers name
  - Callers age
  - Callers Job or work type
- Caller age is required before automatic generation.
- Age is validated from 1 to 120 in the browser and again on the Worker.
- The confirmed caller age is sent with every screenshot-analysis batch and the finalization request.
- The analysis prompt treats caller name, caller age and caller job/work type as confirmed facts belonging to the person being called.
- Generated `About the caller` information is instructed to incorporate the confirmed caller age naturally.
- Desktop auto-fill metadata uses three balanced columns; mobile remains one field per row.

## Preserved

- V15.55 uploaded screenshots replace the original upload panel in place.
- `+ Add more`, per-image remove controls and current screenshot limits remain unchanged.
- `Clear screenshots` remains the smaller secondary action.
- After generation, `Generate information` is replaced by `Add generated information to call`.
- Changing the screenshot set invalidates the previous generated result.
- V15.54 caller-focused labels and role separation remain unchanged.
- V15.53 mobile sheet positioning, V15.52 editable custom voices, calls, credits, payments, referrals, promotional email studio and admin behavior remain unchanged.

## Deployment verification

After deployment:

```text
https://callfocus.link/api/app-version
```

Expected:

```json
{"version":"15.56-test"}
```
