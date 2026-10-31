# @nascencestudio/tapestry-seo

**SEO for [Tapestry](https://github.com/nascencestudio/tapestry) sites on [StudioCMS](https://studiocms.dev):**
each page's search title, description and social image edited right in Tapestry's editor, the meta
tags for them, a robots.txt you control from the dashboard (including AI crawlers), and a sitemap of
every published page.

- **Crawlers (robots.txt):** about 210 known crawlers in categories: search engines, AI training,
  AI search, AI assistants and agents, other AI, SEO tools, social link previews and web archives.
  Allow or block a whole category, or choose crawler by crawler. Presets ("Block AI training",
  "Block all AI crawlers"…), extra rules, and a preview of the result. The dashboard and plugin APIs stay
  out of crawlers' reach.
- **Sitemap:** every page visitors can see (drafts and unpublished Tapestry pages never appear),
  with translations linked, listed in StudioCMS's sitemap index.
- **Per-page SEO:** an **SEO** button in Tapestry's editor opens the page's settings: search title,
  description, social image (from the [media library](https://github.com/nascencestudio/medialibrary)
  when installed), "hide from search engines" and a canonical address, with a search-result and a
  link-preview preview. Saved at once (not part of the page's draft).
- **Meta tags:** `<Seo>` writes the title, description, canonical link, robots, link-preview (Open
  Graph, X/Twitter) and language alternates. Pages without their own settings use their StudioCMS
  title and description in your title format, then the site defaults.

The AI crawler list comes from [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt)
(MIT). It's bundled with each release and reviewed before it ships; your site never downloads it.

> robots.txt is a request, not a lock: well-behaved crawlers follow it, others ignore it. It reduces
> crawler traffic; it isn't a security barrier.

## Requirements

- Node ≥ 22.12, Astro 7, StudioCMS 0.6 or 0.7, Tapestry 0.4 or 0.7

## Install

```sh
pnpm add @nascencestudio/tapestry-seo
```

```js
// studiocms.config.mjs
import tapestry, { tapestryComponentRegistry } from '@nascencestudio/tapestry';
import tapestrySeo from '@nascencestudio/tapestry-seo';
import { defineStudioCMSConfig } from 'studiocms/config';
import { components } from './src/tapestry.config.mjs';

export default defineStudioCMSConfig({
  features: {
    // Tapestry SEO serves robots.txt; StudioCMS's own would replace it in production.
    robotsTXT: false,
  },
  componentRegistry: { ...tapestryComponentRegistry() },
  plugins: [tapestry({ components }), tapestrySeo()],
});
```

`robotsTXT` must be under `features` (a top-level key is ignored); the build stops with an
explanation if StudioCMS's robots.txt is still on. Remove any `public/robots.txt` file too: a static
file would win over the generated one.

Set Astro's `site` option to your public URL, so the sitemap, robots.txt and the meta tags use it.

Then put `<Seo>` in your layout's `<head>`, in place of your own `<title>` and description:

```astro
---
// src/layouts/Layout.astro (your page route passes getPage()'s result)
import Seo from '@nascencestudio/tapestry-seo/Seo.astro';
const { result } = Astro.props;
---
<head>
  <meta charset="utf-8" />
  <Seo page={result} />
</head>
```

Routes without a StudioCMS page pass their own: `<Seo title="Page not found" noindex />`.

## Use

- **A page's SEO:** open the page in Tapestry's editor and choose **SEO** in the purple bar (anyone
  who can edit the page). Leave a field empty to use the page's own title or description. Social
  images should be JPEG, PNG, WebP or GIF, about 1200 × 630 pixels (link previews can't show SVG).
- **Site settings:** Dashboard → **Plugins → Tapestry SEO** (admins): site name and title format
  (`{page} | {site}`), default description and social image, crawlers, sitemap. Changes apply at
  once; `/robots.txt` and the sitemap are cached for up to 5 minutes.

- `/robots.txt`
- `/sitemap-index.xml` (StudioCMS's index, which lists this plugin's page sitemap)

## How it's built

Tapestry SEO is developed with an AI coding assistant (Anthropic's Claude), directed by its
maintainer at Nascence Studio, who sets the requirements, makes the decisions and checks the
results. Commits written with its help say so (`Co-Authored-By`).

What keeps that accountable:

- **Decisions are written down** in [docs/decisions](docs/decisions/), and each working session is
  recorded in the [devlog](docs/devlog.md).
- **Behaviour is tested.** Unit tests cover the crawler list (every name a safe robots.txt token),
  the settings, per-page settings, the meta tags, robots.txt and the sitemap, with adversarial cases
  for everything that comes from a form or the database (`javascript:` and `data:` addresses,
  credentials in URLs, control characters, oversized values). Browser tests drive the settings page,
  the SEO dialog and check what visitors and crawlers get, including an accessibility audit; they
  live in [tapestry-playground](https://github.com/nascencestudio/tapestry-playground).
- **No outside data at runtime.** The crawler list is reviewed and bundled; extra rules are checked
  line by line; the sitemap only writes escaped URLs on the site's own origin.
- **Releases are traceable.** Versions are published from GitHub Actions with npm provenance, and
  each one is approved by a person with two-factor authentication.

Found a problem? Please [open an issue](https://github.com/nascencestudio/tapestry-seo/issues).

## License

MIT © Nascence Studio. The bundled AI crawler data is from ai.robots.txt, MIT © ai.robots.txt
([licenses/ai.robots.txt-LICENSE](licenses/ai.robots.txt-LICENSE)).
