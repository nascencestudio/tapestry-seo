# 0001. Tapestry SEO: robots.txt, sitemap, per-page settings

- Status: Accepted (the user's decisions, 2026-10-10/11). Stage 1 (robots.txt, sitemap, settings
  page) built; stage 2 (per-page SEO in Tapestry's editor, meta tags) next.
- Date: 2026-10-11

## Context

The user maintains robots.txt by hand at work to keep AI bots, SEO tools and other crawlers out
(traffic, scraping), and wanted that in the dashboard, together with a sitemap and per-page SEO.
No StudioCMS SEO plugin exists; the Astro options (`astro-seo` and others) only write meta tags.
StudioCMS ships a build-time robots.txt and a sitemap index plugins can add to, but no admin
control.

## Decision

1. **One plugin, tied to Tapestry**: `@nascencestudio/tapestry-seo` (the user named it after the
   dependency). It `requires` the Tapestry plugin and builds on its `listPublicPages()` (Tapestry
   ADR 0039), so the sitemap lists exactly the pages visitors can see.
2. **Crawler data is bundled, never fetched by sites.** AI crawlers come from
   [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) (MIT, the community-maintained
   list, ~180 bots with operator, purpose and whether they obey robots.txt);
   `scripts/update-bots.mjs` turns it into `src/data/ai-bots.ts`: categories mapped from the free-text
   purpose (plus a short reviewed override list), operators cleaned to a name, duplicate spellings
   merged, unsafe tokens dropped. Other crawlers (search engines, SEO tools, link previews,
   archives) are a short hand-maintained list. A weekly workflow opens a pull request when the
   upstream list changes; releases carry the reviewed copy. The license travels in `licenses/`.
3. **Categories** (search, AI training, AI search, AI assistants/agents, other AI, SEO tools, social
   link previews, archives), each **allowed, blocked** (including bots later releases add to it) or
   **chosen one by one**. Presets set the categories in one click. Nothing is blocked by default:
   installing the plugin changes no crawler's access, except keeping all crawlers out of the
   dashboard and the plugin APIs (on by default).
4. **robots.txt only, no enforcement** (the user's choice): the plugin asks; it doesn't refuse
   requests. The settings page says plainly that robots.txt is voluntary.
5. **Extra rules** are added as written, after a line-by-line check (known directives, comments,
   blank lines; no control characters; size limits). Invalid rules are refused with the line
   number, and what was typed is kept on the page; nothing is saved.
6. **Sitemap through StudioCMS's hook** (`studiocms:sitemap`): StudioCMS serves `/sitemap-index.xml`
   and our page sitemap at `/sitemap-nascencestudio_tapestry_seo.xml`. Entries: absolute http(s)
   URLs on the site's own origin only (Astro `site`, else the request's), `lastmod` from the page,
   translations as `xhtml:link` alternates; page types can be left out; the sitemap can be turned
   off (then empty, and robots.txt drops its Sitemap line). Everything is XML-escaped.
7. **StudioCMS's own robots.txt must be off** (`features.robotsTXT: false`; a top-level key is
   silently ignored). It's written as a static file at build time and would replace ours in
   production only, so the plugin stops the build with an explanation when it's on.
8. **Settings page** at Plugins → Tapestry SEO (admins only, StudioCMS dashboard layout); the form
   posts to the page itself (same-origin check, 64 KB limit). Settings are one JSON row in
   `StudioCMSPluginData`, re-validated on every read; robots.txt and the sitemap read it fresh
   (cached 5 minutes by browsers and CDNs).
9. **Stage 2** (decided, not built yet): per-page SEO settings (search title, description, social
   image, noindex, sitemap inclusion, canonical) in a modal opened by an **SEO** button in Tapestry's
   editor bar when this plugin is installed; saved immediately (not with the page's draft/publish);
   non-Tapestry pages fall back to their StudioCMS title and description. A `<Seo>` component writes
   the meta tags.

## Alternatives considered

- **A tab on StudioCMS's page edit screen:** no hook for it; injecting one by script would break
  on StudioCMS updates. A separate dashboard SEO page was the other option; the user chose the
  Tapestry editor.
- **Enforcing blocks (403 by user agent):** offered; declined for now.
- **Fetching the crawler list at runtime / an admin "update" button:** fresher, but sites would
  trust and contact an outside source; declined.
- **crawler-user-agents** (~1,500 patterns): built for detecting bots by pattern, not robots.txt
  tokens, and has no categories.

## Consequences

- Sites need Tapestry ≥ 0.3.0 (`listPublicPages()`).
- New crawlers reach sites with plugin releases (weekly pull requests to review).
- Pull requests opened by the weekly workflow need a close/reopen to run CI (GitHub doesn't start
  workflows for its own token's pull requests).
