# CallFocus V16.55 — Search & AI Discovery

## Scope (public-facing only)

Adds a crawlable `/features` page and accurate service descriptions in the homepage, About page, sitemap, schema and llms.txt. No changes to payments, wallet, authentication, referral logic, voice prompts, AI call engines, voice-cloning integrations, admin controls or customer data.

### Modified files
- `index.html` — public service overview, About/FAQ updates, home structured data, metadata and navigation link
- `about.html` — full service references and link to Features
- `_worker.js` — one additional static page mapping for `/features` (no API changes)
- `sitemap.xml` — canonical crawlable feature page and updated modification dates
- `llms.txt` — plain-text service catalog for readers and AI tools

### Added files
- `features.html` — publicly accessible feature descriptions, FAQ and valid JSON-LD
- `features.css` — scoped visual styling for the public Features page and overview, without changing other layouts

## Deploy
1. Back up your live repository and keep V16.54 as fallback.
2. Upload **Changes Only** into the current GitHub `main` branch, keeping all other existing files.
3. Check Cloudflare deployment success. If your pipeline uses `wrangler versions upload`, activate/promote the uploaded version separately.
4. Visit `https://callfocus.link/features`, `https://callfocus.link/about`, `https://callfocus.link/`, `https://callfocus.link/sitemap.xml` and `https://callfocus.link/llms.txt` in a private window.
5. In Google Search Console, submit `/sitemap.xml` and request indexing for `/features`, `/about`, and the homepage.

### Expectation
This makes service facts available in visible public HTML and crawler metadata. Google and Gemini choose independently what to crawl/index and how to answer; instant or guaranteed AI discovery is not possible. `llms.txt` is informational and is not guaranteed to be consumed by any AI engine.

### Safety
No SQL migration. Do not run old migration SQL. Existing original original live AI calls, saved cloned voices, payments, accounts, and admin features remain unchanged.
