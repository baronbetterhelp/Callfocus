# CallFocus V15.9 — Quick Start Video & Telegram Help Hub

Built directly on CallFocus V15.8, preserving V15.8 persistent sign-in and call-cost monitoring plus all earlier customer/admin behavior.

## Home quick-start experience

- Replaces the old Telegram-only delayed promo with a combined CallFocus help panel.
- The panel appears on Home after 2 seconds and closes itself after 8 seconds if untouched.
- The close button immediately minimizes the panel into the floating help button.
- The centered panel presents two clear actions: **Watch how to use CallFocus** and **Join Telegram channel**.
- The Telegram destination remains `https://t.me/callfocus`.

## Video guide

- Uses the supplied YouTube guide `https://youtu.be/t91M_7QkMyA`.
- The video opens inside a floating CallFocus panel using YouTube's privacy-enhanced embed domain.
- Playback starts only after the customer chooses the video action.
- Closing the video stops the embed and returns the experience to the floating help button.

## Floating help button

- Alternates continuously between YouTube and Telegram logos.
- Includes a visible `1` unread badge until the customer opens the help menu during the current page session.
- Includes a continuously rotating/pulsing ring so the control feels active without blocking the page.
- Remains draggable, retaining the behavior of the prior Telegram button.
- Clicking it opens the two-action help menu.

## Route behavior

The help experience remains Home-only, matching the existing CallFocus rule. It disappears immediately on other customer pages, including calls/payment interfaces, and returns as the floating button when Home is revisited during the same app session.

## Build/cache

Customer and admin asset references are bumped to V15.9 and `/api/app-version` returns `15.9`. The existing V15.8 persistent admin-session storage key is intentionally unchanged so remembered admin sessions are not invalidated by this UI update.
