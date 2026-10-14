# CallFocus V15.37 Visual Test — Story Cards Bottom-Up Reveal

Built directly on **V15.36 Visual Test**. Stable V15.16 remains the approved stable base unless a visual-test branch is explicitly promoted.

## Changes

- The Home **Context In**, **Conversation Live**, and **Memory Forward** story panels no longer slide in from the side.
- These large story panels now use the same smooth vertical reveal family as the lighter bento panels shown farther down the Home page.
- On normal downward scrolling they rise into place from below.
- V15.36 repeat-reveal behavior is preserved, so they animate again after fully leaving and re-entering the viewport.
- Added a CSS guard so stale route markup that still carries an old left/right reveal class cannot reintroduce the sideways motion for these story cards.

## Unchanged

Calls, credits, payments, referrals, authentication, admin controls, customer notifications, Quick Start, voice notes, Recent Calls, themes and backend behavior are unchanged.

Build: `15.37-test`
