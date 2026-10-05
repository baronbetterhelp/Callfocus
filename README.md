# CallFocus V10.7 update

This update permanently declares the existing Cloudflare KV namespace binding in `wrangler.jsonc`.

Binding: `CALLFOCUS_CONFIG`
Namespace ID: `772f9544dbb7486480e876df3a7a7d3d`

Replace only `wrangler.jsonc` in the GitHub repository and commit. Future Wrangler/GitHub deployments will retain this KV binding instead of requiring it to be re-added manually.

`keep_vars: true` remains enabled so dashboard-managed secrets such as `OPENAI_API_KEY` and `CALLFOCUS_ADMIN_PASSCODE` are preserved.
