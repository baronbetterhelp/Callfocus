# CallFocus V16.56 — Provider-neutral public copy hotfix

Urgent correction following V16.55: public descriptions of CallFocus services should not expose underlying third-party AI infrastructure.

## Scope
- Remove named AI vendors from public homepage and About/Features pages, social descriptions and structured JSON-LD.
- Remove named AI vendors from the public AI-discovery service catalog (`llms.txt`).
- Refresh sitemap modification dates for changed public pages.
- Keep every advertised CallFocus feature clearly documented, including real-time calls, permanent consent-based voice cloning, voice notes, Live AI Avatar, Image to Video, caller context, translation, account credits and referrals.
- Preserve all production Worker code, admin configuration, integrations, voice behavior, authentication, wallet, payments and customer data unchanged.

## Deployment
Upload *Changes Only* files to the existing current repo, allow the Cloudflare build to finish, and activate the build. Verify rendered `/`, `/about`, `/features` and `/llms.txt` after deployment.
Use Search Console URL Inspection to request recrawling of the changed public URLs. A search engine's previously generated responses cannot be instantly recalled by this code change.

## Privacy note
This hotfix sanitizes public marketing/search content. The connected source repository and client/server code may still contain internal vendor identifiers required for integrations. Keeping that source non-public requires repository-visibility and history review separately.

No SQL migration is necessary.
