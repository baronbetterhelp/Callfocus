# ToolCart V1.8 — Administrator Bootstrap Reliability

## First-time administrator setup

- Keeps bootstrap errors visible directly inside the setup form on mobile.
- Distinguishes a missing Cloudflare `ADMIN_BOOTSTRAP_TOKEN`, an incorrect token, an existing administrator, and D1 setup/database failures.
- Shows an in-progress state while the owner administrator is being created.
- Creates an administrator session immediately after successful owner creation.
- Automatically opens the Admin dashboard after successful setup instead of returning to the sign-in screen.
- Includes a safe fallback: if the owner account is created but automatic session creation fails, ToolCart clearly says the account was created and returns to sign-in with the email prefilled.
- Preserves one-time bootstrap protection. Once any administrator exists, new bootstrap attempts are rejected.

## Database

No D1 migration is required.
