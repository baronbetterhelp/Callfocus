# ToolCart V1.8

Upload the contents of the **Changes Only** package to the root of the existing ToolCart GitHub repository and replace matching files.

No D1 migration is required.

## First administrator

1. In Cloudflare, add a Worker secret named `ADMIN_BOOTSTRAP_TOKEN` with a long temporary random value.
2. Deploy/redeploy ToolCart.
3. Open `/admin` and choose **First-time administrator setup**.
4. Enter the same temporary bootstrap token, your administrator name, email and a password of at least 12 characters.
5. On success, ToolCart automatically signs you in and opens the Admin dashboard.
6. Remove or rotate `ADMIN_BOOTSTRAP_TOKEN` in Cloudflare after the owner administrator is created.
7. Use the normal `/admin` sign-in form from then on.

If setup cannot continue, V1.8 keeps a clear error message visible inside the setup form instead of relying only on a temporary toast.
