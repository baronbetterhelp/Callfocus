# CallFocus V16.11 — PocketFi hosted checkout return and pending payment recovery (TEST ONLY)

## Source and scope
Created from the exact public GitHub `main` source at commit `a794c8d` (V16.09) using the V16.10 hosted-checkout patch with focused additional fixes. Production code changes are limited to: `_worker.js`, `callfocus.js`, `index.html`, `credits.html`, `admin.js`, `admin.html`.

## PocketFi changes
- Continue using PocketFi *hosted checkout* (`/api/v1/checkout/request`), NOT per-customer fixed accounts. Checkout now gets an explicit `redirect_link` of `/credits?pocketfi=return` on whichever origin starts payment.
- CallFocus already verified completed payments via signed-in `/api/pocketfi/verify` calling PocketFi `/api/v1/checkout/confirm`. We preserve its actual status, amount, owner and reference checks and its original wallet code.
- If the customer returns without the usual query parameter, the client checks its stored payment ID. New signed-in `GET /api/pocketfi/pending` also finds the customer's own uncredited checkout after sessionStorage loss (read-only: no PocketFi calls or wallet writes). The client then uses the same existing authenticated verification route.
- Verification also resumes on focus/pageshow/visibilitychange and preserves a pending ID for later review. It never treats the redirect itself as proof of money received. Confirmed credit attempts update the displayed wallet balance and transactions.
- Stop issuing **new** permanent PocketFi accounts and hide the legacy bank option. Keep all existing account mappings, historic signed transfers and their old webhook handler for safe reconciliation. Existing customer balance writes stay in KV; D1 remains inactive.
- Fix admin false-positive build warning by making admin UI expected version match worker `16.11-pocketfi-checkout-resume-test`; unchanged admin control IDs and handlers preserved.
- Cache-bust the changed frontend JS in HTML so iPhone Safari gets the correct checkout and admin scripts.

## What this cannot fix by itself
- PocketFi's OWN "Checkout Not Found"/expired session page or a hosted checkout that refuses to redirect after receiving money. That behavior must be investigated in provider session logs, and it cannot be forced from CallFocus JavaScript while the browser remains on pocketfi.ng. Users can manually revisit CallFocus Credits to trigger safe verification of an outstanding pending order.
- Existing Cloudflare KV concurrency/lost-update risk when multiple payments and balance-changing activities overlap. Do not make large-scale financial reliability promises based on a few successful payments. No KV-to-D1 migration is bundled.
- No webhook was configured or added. The existing `/api/pocketfi/bank/webhook` is for the former *static account* flow and should not be substituted without confirming PocketFi's hosted checkout event contract.

## Practical rollout (no large migration)
1. Only upload **changes-only** files at the repo root into a new tested preview version. Do not merge the abandoned `baronbetterhelp-patch-1` audit branch.
2. Confirm preview `/api/app-version` is `16.11-pocketfi-checkout-resume-test`, admin has no version mismatch, and the KoraPay/customer home remains functional. The updated Worker sends `/credits?pocketfi=return` to PocketFi.
3. Use an official provider test/sandbox transaction if available, or an approved minimal live customer payment, after earlier existing charges are reconciled. Verify pending, success, duplicate and customer credits in both preview and production; only promote after verification.
4. If PocketFi stays on "Checkout Not Found", provide their support with the *payment ID and checkout timestamp*, not merchant keys. The existing signed-in CallFocus Credits recovery can check completed payments safely.
5. Never manually add balance for a payment already recorded in Transactions & Usage. Disable PocketFi checkout for new customers during investigation if new payments remain stranded.

## Source audit
- GitHub `main` previously contained the dormant D1 schema and old manual schema workflow and V16.09 README. They are not activated by this patch. No secret, account data or generated source-map was inserted into GitHub by this package.
- The abandoned staging branch was not merged. This package does not delete any historic files, financial references, account records, or other payment code.
- `.assetsignore` remains byte-equal to public `main`; a later separately approved build should exclude Wrangler generated `.wrangler/tmp` maps and private tooling from public assets.

## Validation (no real provider purchase)
Node JS syntax, ZIP integrity, simulated checkout init + pending + verified payment + retry tests, and frontend checks using a simulated browser. This is not a verified real PocketFi end-to-end production test.
