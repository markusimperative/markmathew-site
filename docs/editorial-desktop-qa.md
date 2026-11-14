# Desktop implementation QA

Checked in Chrome on 31 October 2026 against approved Figma desktop B. The three design widths use real same-origin iframe viewports. The direct browser preview is 1363×936; its normal scrollbar reduces the available content width.

| Viewport | Content width | Left / right content gutters | Document height | Horizontal overflow | Text overflow |
| --- | --- | --- | --- | --- | --- |
| 1280×800 | 1120px | 80 / 80px | 3659px | None | None |
| 1440×900 | 1280px | 80 / 80px | 3728px | None | None |
| 1920×1080 | 1280px | 320 / 320px | 3728px | None | None |

At 1440px, the section starts match the approved frame within browser subpixel rounding: navigation 0, hero 128, About 1280, In view 1680, Behind the work 2496, A few ways in 2840, footer 3568. The supporting artwork is 256×177, feature artwork 752×308, and all three badges are 24px high with 16/20 text. Computed desktop typography matches 70/80 display, 48/56 masthead, 40/48 item titles and hero lead, and 24/32 body.

## Interaction results

- All five gallery buttons select the correct caption and pressed state, with exactly one index in the Tab sequence. Left/Right wrap; Home/End select the first/last. Keyboard focus has an immediate blue outline.
- All four directory previews load and appear on keyboard focus. Pointer hover was exercised on Experiments; it shows the matching preview. Essential row text and destinations remain visible without previews.
- Connect opens the chosen Notes, Medium and GitHub profiles. Tab from the last link wraps to Close; Shift+Tab from Close wraps to the last link. Escape closes the panel and restores the trigger's focus.
- With scripts disabled, all five artwork images and page content remain visible, gallery controls are disabled, and the static explanatory note appears. Connect navigates to its real fallback page.
- About and both study destinations load. Their original SVG artwork renders at 680×506.906 and 680×606.406 respectively, matching the exported root proportions.
- WIP targets In view and moves focus to that section. About/Back links preserve their section destinations.
- All supplied artwork has a non-empty local file, a matching design slot and callsite, and verified rendered geometry. No temporary Figma asset URLs remain.

## Checks and limits

The final build runs the independent game compiler and website integrity checker. No game source or existing experiment styles were changed. The runtime allowlist remains explicit and verifies references, required assets, copied-game hashes, file sizes and local-only configuration. Cloudflare configuration is checked by Wrangler dry run.

The original artwork resolution is retained. Mobile is a responsive fallback, not an approved mobile redesign. Reduced-motion branches are implemented and inspected; an OS reduced-motion preference was not emulated. No screen-reader audit, public deployment or external-destination availability check is claimed. The standalone loopback Worker HTTP test was not run alongside the managed preview. The local QA helper is excluded from the final runtime.
