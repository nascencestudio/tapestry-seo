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

## 2026-10-12: Settings page: choices made before the script runs

The playground's SEO suite, run with a 4× slower CPU (`E2E_CPU_THROTTLE=4`), clicked "Choose one by
one" right after a save, before the page's script had attached its change handlers: the radio was
selected but the checkboxes stayed disabled. The script now also syncs each category once when it
starts (it renders the same state the server does, so nothing changes otherwise). 0.1.1.

## 2026-10-12: Stage 2: per-page SEO, `<Seo>`, site defaults (0.2.0)

**Request:** the SEO button in Tapestry's editor for each page's SEO. Decisions (the user): the
essential fields, site defaults on the settings page, search and link previews, editors may change
SEO. [ADR 0002](decisions/0002-per-page-seo.md); Tapestry side: Tapestry ADR 0040 (0.4.0).

### Done
- Per-page settings (`page-seo.ts`), meta tags (`meta.ts`), site defaults (settings), sitemap leaves
  out noindex pages and pages whose canonical points elsewhere.
- `/_seo/page` (GET/POST, editors), one plugin-data row per page, `<Seo>` component, Site defaults
  section on the settings page (media picker for the default image).
- The dialog (`/editor`, Preact): fields with counters, search-result and link-card previews, media
  picker, saves at once.
- Tests: 62 unit tests (adversarial URLs and text); playground `seo-page` suite (9 steps, also at
  4× CPU slowdown) and the dialog in the a11y audit (both themes).

### Learned
- A hidden page (or a 404) shouldn't name a canonical address of its own: `noindex` routes get no
  self-canonical (a custom one still applies).
- Tapestry's primary buttons use `--text-inverted` on `--primary-base`; plain white fails contrast on
  StudioCMS's light purple in the dark theme.

### Next
- Tapestry 0.4.0 is on npm (2026-10-13); the dev dependency uses it. Release 0.2.0 next.

## 2026-10-30: 0.2.1 prepared

- Version 0.2.1: StudioCMS 0.7 alongside 0.6, Tapestry 0.4 or 0.7 (`^0.4.0 || ^0.7.0`: 0.5 and 0.6 are never
  published), Preact ranges (Tapestry ADR 0044), current dev tools, audit refresh (nodemailer, undici).
