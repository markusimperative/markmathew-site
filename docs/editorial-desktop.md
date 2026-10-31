# Editorial desktop homepage

Implements approved desktop B at 1440px with a centered 1280px content area and 80px margins. The artwork stage is intentionally full bleed, capped at 1440px. The top wordmark is 48/56, display headings 70/80, project/directory titles and the hero lead 40/48, body/navigation 24/32, and compact status labels 16/20. Newsreader and IBM Plex Sans are self-hosted in WOFF2 format with their SIL Open Font Licenses.

The homepage uses its own home.css and home.js; site.css, the existing experiment directory and the independent game remain unchanged. Narrower layouts reflow as a fallback; the approved desktop is the design target.

Gallery buttons reproduce the five Figma gallery variants, initially study 3. Click a card or an index; Left/Right wrap through studies and Home/End select the first/last. The selected index is the keyboard tab stop and the caption announces changes. Only transforms animate; reduced motion disables the animation. No wheel scrolling, autoplay or dragging is claimed.

Each directory row is a real link, with the same preview on hover and keyboard focus. WIP returns to In view. New About and study-preview pages keep the existing Figma content. Connect opens a native modal with the public profiles chosen by Mark: Notes, Medium and GitHub. Escape/Close restore focus. Its ordinary /connect/ link remains usable without JavaScript.

## Artwork provenance

Artwork is exported unchanged from the approved Figma file. It has not been regenerated or replaced. The original raster resolution is retained.

| File | Design slot |
| --- | --- |
| landscape.png | Hero card 01 / Landscape exploration |
| data.png | Hero card 02 / Data as material |
| portal.png | Hero card 03 / Architectural light study |
| lexography-card.png | Hero card 04 / Lexography |
| energy.png | Hero card 05 / Energy studies |
| lexography-feature.png | In view / featured Lexography image |
| research.png | In view / Research thumbnail |
| design-tool.png | In view / Design tool thumbnail |
| status-dot.svg | All three compact status labels, original 6×6 root |
| arrow-wip.svg | Directory WIP arrow, original 32×32 root |
| arrow-external.svg | Directory Experiments, Thoughts and Archive arrows, original 32×32 root |
| preview-wip.png | Directory WIP hover/focus preview |
| preview-experiments.png | Directory Experiments hover/focus preview |
| preview-thoughts.png | Directory Thoughts hover/focus preview |
| preview-archive.png | Directory Archive hover/focus preview |
| research-detail.svg | Research study destination, original 680×506.909 root |
| design-tool-detail.svg | Design tool study destination, original 680×606.407 root |

Font sources are Google Fonts' Newsreader and IBM Plex Sans distributions. WOFF2 compression preserves font outlines; the accompanying license files retain their original text.

## Validation

Run npm run build from the website checkout with the-counter beside it. The existing build compiles and copies that independent runtime, then checks its hashes, references, file allowlist, size limits and local-only configuration. The allowlist includes only the new homepage files, declared destination pages, artwork and fonts in addition to the existing runtime.

Browser QA covers the new homepage, native Connect modal, gallery selection, keyboard navigation, directory previews and internal links. Desktop widths are checked with real same-origin iframe viewports in an ignored local QA page; it is removed before final packaging. No test helpers enter the published runtime.
