# Build and deployment notes

The website keeps a small static foundation and consumes the sibling game's `build:site` output. The production runtime allowlist contains the website pages, its CSS/header configuration, and the game's HTML, favicon, application assets, artwork and audio. Source, local collection code, participant responses and documentation do not enter the runtime.

The build adds the portfolio's canonical URL and sharing metadata to the game entry page after copying it. The runtime check verifies that overlay and compares the remaining game files byte for byte with the sibling build.

`npm run build` runs the game build, copies the runtime and checks the result. `npm run check:cloudflare` validates the local configuration without deploying. `npm run preview` runs Wrangler locally; `npm run check:preview` checks the actual local HTTP responses. Optional staging preparation adds noindex headers to a separate candidate directory and never weakens the hosted staging protection.

The public production configuration retains the existing Worker name and exact apex Custom Domain but omits the owner's account ID. An authorized maintainer must use the verified owner-specific local production configuration and existing Cloudflare credentials for deployment. Verify the current version and binding first, preserve its version for rollback, then check public HTTPS, runtime hashes, canonical redirects and staging protection after an update. Never deploy to the protected review Worker as a substitute for production.

This source publication does not provision DNS, certificates, Access, GitHub Pages, CI, a database or a collector. It changes no Substack publication or email service. No deployment runs automatically when the public repository is pushed.
