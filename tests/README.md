# Portfolio browser tests

These tests exercise the built site in `dist/` through the repository's local Wrangler preview. Playwright starts and stops that preview on port 8787.

## Run the suite

Complete the setup in the [repository README](../README.md#local-development) and run `npm run build` from the repository root. Close any existing preview on port 8787, then run these commands from `tests`.

```sh
npm ci
npx playwright install chromium --only-shell
npm test
```

If PowerShell blocks the npm script shims, use `npm.cmd` and `npx.cmd` in those commands.

Use `npm run test:behavior` for the destination, keyboard, responsive, and axe checks. Use `npm run test:visual` for screenshot comparisons. Open the latest HTML report with `npx playwright show-report` or read `playwright-report/index.html`. Each axe test attaches its full JSON results, including elements marked for manual review. Visual failures show the expected, actual, and diff images in the report.

## Coverage

- Project story links from Home and WIP, external product and prototype URLs, Archive navigation, the playable Counter entry, and the contact fallback with JavaScript disabled. The tests assert external URLs without contacting those sites.
- Keyboard focus on the skip link, selection and activation in the gallery with default and reduced motion, focus wrap and return in the Connect dialog, and a gallery tap in Chromium's mobile emulation.
- Gallery caption and control alignment at narrow and short sizes, continuity from 1099 to 1100 pixels, and shared header and footer alignment at 3440 pixels.
- Axe-core checks for applicable WCAG 2.0 through 2.2 A and AA rules on the primary routes, with additional scans of the mobile gallery and open Connect dialog. Screen reader announcements and physical touch behavior require manual verification. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

## Screenshot baselines

`screenshots/win32` contains the Windows Chromium baselines for the homepage at 390, 1099, 1100, and 1912 pixels wide and the open mobile Connect dialog. Run the screenshot comparisons in the baseline environment because rendering can vary by operating system and browser. On another operating system, run the behavior suite or generate and review baselines for that platform. [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

When a visual change is intentional, run `npm run test:update-screenshots`, inspect the changed images, and run `npm test` to verify the new baselines. Ordinary test runs fail when a baseline is missing or the image exceeds the configured diff tolerance.
