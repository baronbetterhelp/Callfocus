# ToolCart V1.0 Production Checklist

## Cloudflare
- [ ] D1 database `toolcart` created
- [ ] `REPLACE_WITH_D1_DATABASE_ID` replaced in `wrangler.jsonc`
- [ ] R2 bucket `toolcart-media` created
- [ ] `APP_ORIGIN` changed to final HTTPS ToolCart origin
- [ ] D1 migrations applied remotely
- [ ] Optional seed reviewed before use
- [ ] Worker deployed successfully
- [ ] Custom domain/route attached

## Secrets and providers
- [ ] `RESEND_API_KEY` set
- [ ] `RESEND_FROM` set to a verified sender
- [ ] `PAYSTACK_SECRET_KEY` set to test key first
- [ ] `ADMIN_BOOTSTRAP_TOKEN` set to a long random value
- [ ] First owner admin created
- [ ] Bootstrap token rotated/removed after first owner creation
- [ ] Paystack webhook points to `/api/payments/paystack/webhook`

## Administrator setup
- [ ] `/admin` sign-in tested
- [ ] Support email replaced in Admin → Settings
- [ ] Default theme reviewed
- [ ] Dock sections reviewed
- [ ] Subscription plan prices/frequencies reviewed
- [ ] Apps created/edited from Admin without code changes
- [ ] App URLs verified
- [ ] Maintenance messages verified

## Customer flow
- [ ] Create account
- [ ] Receive verification email
- [ ] Verify account
- [ ] Sign in
- [ ] Reopen browser and remain signed in
- [ ] Favorite app
- [ ] Open app and see it under Recently Opened
- [ ] Search ecosystem
- [ ] Submit request
- [ ] Receive staff response and notification
- [ ] Change profile
- [ ] Change password
- [ ] View/revoke device session
- [ ] Switch Midnight/Pearl if enabled

## Payments
- [ ] Paystack test checkout initializes
- [ ] Browser return does not independently activate subscription
- [ ] Server verify endpoint confirms transaction
- [ ] Signed webhook confirms transaction
- [ ] Subscription is created only after successful verification
- [ ] Payment appears in customer history
- [ ] Payment appears in Admin
- [ ] Controlled live payment completed before public launch

## Device testing
- [ ] iPhone Safari
- [ ] Installed iPhone PWA
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] No horizontal scroll
- [ ] Bottom dock clears safe area
- [ ] Dock hides while mobile keyboard is open
- [ ] Reduced-motion preference works
