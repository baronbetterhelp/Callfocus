# CallFocus V15.94 — Auto-Fill Speaker Identity Correction

**Authoritative base:** The complete V15.93 CallFocus build (not an older version or rollback).

## Exact change
- Fixes inverted speaker identity in the automatic caller-information generator: caller details supplied in the modal now refer to the **CallFocus user/person placing the call**, and must populate **About you** (`aboutSelf`).
- The **person being called** is now treated as a different person, learned only from screenshot evidence and optionally from the existing recipient name entered in the call form; that person's profile goes to **About the person you're calling** (`aboutCaller`).
- The name of the person being called can be inferred from an unambiguous screenshot contact name or reference. If unknown, its generated value stays blank for customer review; it does not silently use the service user's name. The name is visible/editable in the generation review panel before application.
- Fixed the modal's name prefill previously copied from the recipient field into the caller/customer identity fields. Existing recipient name already typed into the call form is not overwritten by auto-fill.
- Both screenshot-batch and final synthesis instructions explicitly keep the identities and details separate; uncertain personal facts are omitted instead of guessed.
- No edits to existing saved call information, wallet, payments, promotions, admin settings, maintenance mode, AI provider/model, image batch sizes, mobile scroll handling, or Cloudflare configuration.
- Version/cache labels updated consistently to 15.94-test.

## Important data note
Previously generated descriptions already saved in existing calls cannot be corrected retroactively. Customers should review/correct those fields manually or rerun the revised generator before a real call.

## Testing scope
Local code syntax, mocked provider-request role tests and ZIP integrity; **no production Cloudflare, customer-data, or live provider calls performed**. Use the normal Cloudflare `npx wrangler versions upload` then Version URL test and manually Promote after confirming.
