# CallFocus V15.18 Visual Test — Phone-First Cinematic Home

This is an experimental presentation build based on V15.17 Visual Test and the stable V15.16 product behavior.

## Fixes
- Removed blur from all readable scroll-reveal content.
- Added Safari/iPhone-safe manual reveal checks alongside IntersectionObserver so content cannot remain stuck in a pending visual state.
- Reduced mobile parallax movement to avoid iOS compositor artifacts during fast scrolling and long screenshots.

## Phone-first front page
- Adds a new animated **Live continuity** stage directly inside the mobile hero, so the premium visual experience starts on the first screen instead of farther down the page.
- Animated caller core, orbit rings, live state pulse, context/time/thread chips and voice waveform.
- Hero architecture now moves subtly from the moment the Home page opens.
- Mobile quick actions are presented as a compact three-card tool row.
- Long-form sections were recomposed for phone widths with shorter section spacing, smaller cards, more readable type sizes and less dead vertical space.
- Existing long-form continuity story, dark live-call stage, bento visuals and moving ribbon are preserved and tuned for phones.

## Product behavior
Calls, credits, payments, referrals, authentication, Quick Start admin controls, saved information, voice notes, Recent Calls and other backend features are intentionally unchanged.

Build identifier: `15.18-test`.
