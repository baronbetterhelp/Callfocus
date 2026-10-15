# CallFocus V15.45 Visual Test — Complete Customer List Restore

Built directly on V15.44.

## Fix

- Admin → Customers no longer resets to only the first 50 customer accounts after a page refresh.
- On admin restoration/sign-in and on **Refresh users**, CallFocus now walks all available customer KV pages automatically and rebuilds the complete visible list.
- The customer summary shows the actual completed customer count (for example, `82 customers`) once KV pagination is complete instead of leaving the misleading `50 loaded` state.
- The existing **Load more users** control remains as a fallback if a safety page limit is ever reached or a partial pagination response remains.
- Customer records, balances, payment history, passwords and account data are not modified by this change.
- V15.44 KV emergency optimizations and all existing customer/admin features remain unchanged.

## Build

`15.45-test`
