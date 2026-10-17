# ToolCart V1.5 — Apple-Inspired Beauty Rebuild

Built on top of V1.4.

## What changed

- Rebuilt the customer-facing visual system into an Apple-inspired premium style.
- Redesigned the signed-in Home screen with a cinematic large-type hero message.
- Restyled the floating navigation dock into a rounded glass capsule inspired by Apple control panels.
- Refined mobile typography, spacing, blur, contrast and section hierarchy.
- Redesigned launcher tiles to feel closer to a premium app launcher: compact, icon-first, with only app name and ONLINE/OFFLINE status.
- Changed the default first-load visual preference to Midnight for a darker Apple-style presentation.
- Increased home launcher capacity from 6 apps to 8 apps.
- Updated the PWA shell cache version and manifest theme colors for the new visual system.

## Backend impact

- No D1 schema changes.
- No new migration file.
- No auth or billing logic changes.
- Keeps the working V1.3/V1.4 account system, signup fix and current Cloudflare configuration.

## Current config preserved

- database_id: `ef8f71eb-dd5a-41dd-b049-bfe85066aa98`
- APP_ORIGIN: `https://toolcart.mgt-toolcart.workers.dev`
