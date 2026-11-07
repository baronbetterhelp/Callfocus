# CallFocus V16.68 — Mobile Image to Video Studio

Based on V16.67 complete source. No D1 migration.

- Fixes completed videos appearing far below the editor and history by hiding the editor in result mode.
- On phones, completed video opens in a responsive full-viewport result panel with a visible Download action and a Close button; video scales to the phone viewport.
- Keeps the result panel available without browser zooming, including 320 px screen widths.
- Reflows image upload, prompt, aspect ratio, duration, cost, history, gallery, and progress at phone sizes.
- Prevents horizontal overflow and reduces excessive animation-panel sizing on mobile.
- Adds immediate Download feedback while the short-lived video link is prepared.
- Uses new static-asset version strings for Safari cache refresh.
- Internal generation, history, status, signed video URLs, wallet deductions and refunds remain untouched.
- Keeps users' underlying page scroll position; no automatic scrolling calls added.
- Removes a legacy public third-party name from the Image to Video page header.

Modified: image-video.html, image-video.css, image-video.js, README.md. Added: this README.

After deployment test on real iPhone Safari with a real completed job and download.
