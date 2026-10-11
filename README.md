# @nascencestudio/tapestry-seo

**SEO for [Tapestry](https://github.com/nascencestudio/tapestry) sites on [StudioCMS](https://studiocms.dev):**
a robots.txt you control from the dashboard (including AI crawlers), and a sitemap of every
published page.

- **Crawlers (robots.txt):** about 210 known crawlers in categories: search engines, AI training,
  AI search, AI assistants and agents, other AI, SEO tools, social link previews and web archives.
  Allow or block a whole category, or choose crawler by crawler. Presets ("Block AI training",
  "Block all AI crawlers"…), extra rules, and a preview of the result. The dashboard and plugin APIs stay
  out of crawlers' reach.
- **Sitemap:** every page visitors can see (drafts and unpublished Tapestry pages never appear),
  with translations linked, listed in StudioCMS's sitemap index.
- **Coming next:** per-page SEO settings in Tapestry's editor (search title, description, social
  image, hide from search) and the meta tags for them.

The AI crawler list comes from [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt)
(MIT). It's bundled with each release and reviewed before it ships; your site never downloads it.

> robots.txt is a request, not a lock: well-behaved crawlers follow it, others ignore it. It reduces
> crawler traffic; it isn't a security barrier.

## Requirements

- Node ≥ 22.12, Astro 7, StudioCMS 0.6, Tapestry ≥ 0.3

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

Set Astro's `site` option to your public URL, so the sitemap and robots.txt use it.

## Use

Dashboard → **Plugins → Tapestry SEO** (admins). Changes apply at once; `/robots.txt` and the
sitemap are cached for up to 5 minutes.

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
  the settings, robots.txt and the sitemap, with adversarial cases for everything that comes from
  a form or the database. Browser tests drive the settings page and check the generated files;
  they live in [tapestry-playground](https://github.com/nascencestudio/tapestry-playground).
- **No outside data at runtime.** The crawler list is reviewed and bundled; extra rules are checked
  line by line; the sitemap only writes escaped URLs on the site's own origin.
- **Releases are traceable.** Versions are published from GitHub Actions with npm provenance, and
  each one is approved by a person with two-factor authentication.

Found a problem? Please [open an issue](https://github.com/nascencestudio/tapestry-seo/issues).

## License

MIT © Nascence Studio. The bundled AI crawler data is from ai.robots.txt, MIT © ai.robots.txt
([licenses/ai.robots.txt-LICENSE](licenses/ai.robots.txt-LICENSE)).
