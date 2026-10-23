# CallFocus V16.30 — Full customer list pagination stability

* Smaller 18-account server pages avoid high KV read volume in a single Worker request (each account requires two KV reads).
* Bounded four-account KV read groups avoid oversaturating outgoing connections.
* Admin customer list now updates progressively after every page, rather than showing just the first page until the very end.
* Slow pages have a 16-second timeout with up to three attempts. Errors are surfaced rather than leaving a never-ending Loading indicator. Interrupted scans can resume at the last successfully loaded cursor from the Direct email `Continue loading` button.
* The full scan must finish before any All active customers email sending can proceed. If the scan is incomplete, bulk sending remains blocked.
* Only files edited: `_worker.js` (admin-user listing only), `admin.js` (customer loader only), `admin.html` (cache reference). Original payment, wallet accounting, calling, service email delivery, and marketing safeguards unchanged.
* Live production customer totals cannot be confirmed without authenticated access to production KV; test by checking Admin -> Customers and Direct email against your expected population.
