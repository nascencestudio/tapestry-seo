# 0002. Per-page SEO, meta tags and site defaults

- Status: Accepted (the user's decisions, 2026-10-12)
- Date: 2026-10-12

## Context

Stage 2 of ADR 0001: per-page SEO settings edited from an **SEO** button in Tapestry's editor
(Tapestry ADR 0040), saved at once, plus the meta tags. The user chose:

1. **Fields:** the essentials: search title, description, social image, "hide from search engines"
   (which also leaves the sitemap) and a canonical address under Advanced. One title and description
   serve search results and link previews (no separate social overrides, no structured data).
2. **Site defaults** on the settings page: site name, title format, default description and default
   social image.
3. **Previews** in the dialog: a search result and a link-preview card, with character counters.
4. **Permission:** anyone who can edit the page (editors and up).

## Decision

1. **Storage:** one `StudioCMSPluginData` row per page (`@nascencestudio/tapestry-seo-page:<id>`),
   re-validated on every read (`parsePageSeo`); all-empty settings delete the row. Translations are
   separate pages, so each language has its own settings. Site defaults are part of the settings row.
2. **Validation** (`page-seo.ts`): text is one line (control characters → spaces), trimmed, capped
   (title 200, description 500); images are a media library id (`m_` + 16) or an `https:` URL;
   canonicals are absolute `http(s)` URLs without credentials. The endpoint reports rejected images
   and canonicals instead of dropping them silently. A title format without `{page}` falls back to
   `{page} | {site}`.
3. **Endpoint** `/_seo/page`: GET (editors) returns the page, its settings, the defaults and resolved
   preview images; POST (editors, same origin, JSON ≤ 16 KB, the page must exist) saves.
4. **Meta rules** (`meta.ts`, pure, shared with the dialog's previews): own SEO title as written, else
   the page title in the title format; own description, else the StudioCMS description, else the
   default; canonical = custom, else the page's own address without query string, and none on
   `noindex` routes; Open Graph and Twitter tags with the same text; images only when link previews
   can show them (JPEG, PNG, WebP, GIF; not SVG); `hreflang` alternates with `x-default` for pages
   with two or more visible language versions. `<Seo>` writes them; Astro escapes the attributes.
5. **Sitemap:** pages with `noindex`, or whose canonical points elsewhere, are left out.
6. **Dialog:** `@nascencestudio/tapestry-seo/editor` exports `openSeoEditor()`: a Preact component in
   its own `<dialog>` (like the media picker), styles added once as a `<style>` element (CSS imports
   from browser code leak onto public pages, Tapestry known issue #32), themed with StudioCMS's
   variables. No `name` attributes; Enter in one-line fields is suppressed (the dashboard's page form
   would submit).
7. **Media:** social images use Tapestry's `virtual:tapestry/media` (server lookup) and
   `virtual:tapestry/media-client` (picker); without the media library, an https:// address field.

## Dependencies

**preact 10.29.8** (new runtime dependency): the version Tapestry and the media library already ship
(Tapestry ADR 0002), so sites get no new package. No dependencies of its own; npm provenance
(SLSA v1); about 4 KB gzipped at runtime; MIT. Loaded only in the dashboard, when the SEO button is
used. `pnpm audit` passes.

## Alternatives considered

- **Separate link-preview title/description, structured data:** offered; the user chose the
  essentials (less to fill in; structured data is easy to get wrong).
- **Only people who may publish can change SEO** (since changes go live at once): offered; the user
  chose the same trust as editing.
- **Saving SEO with the page's draft:** decided against in ADR 0001 (immediate save).

## Consequences

- Requires Tapestry ≥ 0.4.0 (the button and `virtual:tapestry/seo-client`).
- Sites replace their own `<title>`/description with `<Seo>`.
- SEO changes are live at once; there's no history for them (unlike page content).
