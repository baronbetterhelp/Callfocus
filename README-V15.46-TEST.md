# CallFocus V15.46 Visual Test — Search Identity & AI Overview Disambiguation

Built on V15.45.

## Purpose
Strengthen search-engine and generative-search understanding of the CallFocus product at callfocus.link and distinguish it from the unrelated Irish Call Focus business at callfocus.ie.

## Changes
- Expanded homepage title, meta description, canonical URL, Open Graph and Twitter metadata.
- Added server-rendered WebSite, SoftwareApplication and FAQ structured data.
- Added a visible About CallFocus identity/FAQ section on the homepage.
- Added an indexable `/about` page with a clear official-product description and explicit non-affiliation statement.
- Added `robots.txt`, `sitemap.xml` and `llms.txt`.
- Added noindex directives to private/account application routes to reduce duplicate search surfaces.
- Added canonical/index directives to public Support, Privacy and Terms pages.
- Updated build and asset version markers to `15.46-test`.

## Important
This build improves the signals available to search engines and AI-generated search features. It cannot force or instantly rewrite a Google AI Overview. Google must recrawl and reprocess the updated pages.
