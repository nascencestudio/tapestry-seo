# Devlog

Short log of this repository's sessions, newest first. The project-wide devlog (all sessions) is
in [tapestry-playground](https://github.com/nascencestudio/tapestry-playground/blob/main/docs/devlog.md).

---

## 2026-10-11: Stage 1: robots.txt, sitemap, settings page

**Request:** an SEO plugin tied to Tapestry: robots.txt with admin-chosen crawlers (AI bots
included), a sitemap, later per-page SEO. [ADR 0001](decisions/0001-tapestry-seo.md).

### Done
- Crawler data: ai.robots.txt snapshot (176 AI crawlers after merging duplicate spellings) via
  `scripts/update-bots.mjs`, plus 34 curated crawlers; 8 categories; weekly update workflow.
- Settings (allow / block / one by one per category, presets, private paths, extra rules, sitemap
  options), robots.txt and sitemap builders, settings page, routes, StudioCMS sitemap hook, and a
  build-time stop when StudioCMS's own robots.txt is on.
- Tapestry: `listPublicPages()` (Tapestry ADR 0039) for the sitemap.
- Tests: 36 unit tests; playground `seo` suite (8 steps) and a11y audit of the settings page; all 25
  browser suites pass.

### Learned
- StudioCMS's robots.txt setting lives under `features`; a top-level `robotsTXT: false` is ignored.
  The plugin's build check caught exactly that in the playground.
- ai.robots.txt lists some crawlers twice with different capitalization, and its operator field
  sometimes holds a sentence or a URL.

### Next
- Stage 2: SEO button and modal in Tapestry's editor; per-page settings; `<Seo>` component.
- Tapestry 0.3.0 is out (2026-10-11); the dev dependency uses it.

## 2026-10-11: Trusted publishing only

0.1.0 is on npm (published with a one-time token, since a trusted publisher needs an existing
package). The trusted publisher is now set up and the package locked down (2FA, no bypass tokens),
so the release workflow no longer passes `NPM_TOKEN`. Delete the `NPM_TOKEN` secret and revoke the
token on npmjs.com if that isn't done yet.
