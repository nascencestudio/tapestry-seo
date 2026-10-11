/**
 * @nascencestudio/tapestry-seo: SEO for Tapestry sites on StudioCMS (ADR 0001).
 * - `/robots.txt` from an admin-controlled crawler list (AI crawlers from ai.robots.txt, search
 *   engines, SEO tools, link previews, archives), with private paths and extra rules;
 * - a page sitemap (every page visitors can see), listed in StudioCMS's `/sitemap-index.xml`;
 * - the settings page: Dashboard → Plugins → Tapestry SEO.
 * Requires Tapestry (`@nascencestudio/tapestry`), whose `listPublicPages()` the sitemap uses.
 *
 * Sites must turn off StudioCMS's own robots.txt (`features.robotsTXT: false`): it's written as a static
 * file at build time, which would hide this plugin's in production. The build stops with an
 * explanation if it's still on.
 */
import { fileURLToPath } from 'node:url';
import { definePlugin } from 'studiocms/plugins';

export type { Bot, CategoryId, Respects } from './bots.js';
export { BOTS, CATEGORIES } from './bots.js';
export { buildRobotsTxt, checkExtraRules } from './robots.js';
export type { CategoryMode, SeoSettings } from './settings.js';
export { DEFAULT_SETTINGS, PRESETS } from './settings.js';
export { buildSitemapXml, sitemapEntries } from './sitemap.js';

const PACKAGE_NAME = '@nascencestudio/tapestry-seo';
const TAPESTRY = '@nascencestudio/tapestry';

export type TapestrySeoPlugin = ReturnType<typeof definePlugin>;

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The message shown when StudioCMS's own robots.txt is still on. */
export const ROBOTS_CONFLICT =
	"[tapestry-seo] StudioCMS's own robots.txt is turned on. It's written as a static file at build time, " +
	"which would replace Tapestry SEO's robots.txt in production. Turn it off in studiocms.config: " +
	'features: { robotsTXT: false } (a top-level robotsTXT is ignored).';

/**
 * The Tapestry SEO plugin.
 *
 * @example
 * ```js
 * // studiocms.config.mjs
 * import tapestry from '@nascencestudio/tapestry';
 * import tapestrySeo from '@nascencestudio/tapestry-seo';
 * export default defineStudioCMSConfig({
 *   features: { robotsTXT: false },
 *   plugins: [tapestry({ components }), tapestrySeo()],
 * });
 * ```
 */
export function tapestrySeo(): TapestrySeoPlugin {
	return definePlugin({
		identifier: PACKAGE_NAME,
		name: 'Tapestry SEO',
		requires: [TAPESTRY],
		hooks: {
			'studiocms:astro-config': ({ addIntegrations }) => {
				addIntegrations({
					name: PACKAGE_NAME,
					hooks: {
						'astro:config:setup': ({ injectRoute }) => {
							const routes: Array<[string, string]> = [
								['/robots.txt', './runtime/robots-route.js'],
								// Plugins → Tapestry SEO. StudioCMS links plugins without a slash, and plugin dashboard
								// pages make `[dashboard]` routes lose to its catch-all (Tapestry known issues #27, #28).
								...['/dashboard', '/[dashboard]'].flatMap(
									(base): Array<[string, string]> =>
										[`${base}/plugins/${PACKAGE_NAME}`, `${base}/plugins${PACKAGE_NAME}`].map((pattern) => [
											pattern,
											'./runtime/SettingsPage.astro',
										]),
								),
							];
							for (const [pattern, entrypoint] of routes) {
								injectRoute({ pattern, entrypoint: resolve(entrypoint), prerender: false });
							}
						},
						'astro:config:done': ({ config }) => {
							if (config.integrations.some((integration) => integration.name === 'studiocms/robotstxt')) {
								throw new Error(ROBOTS_CONFLICT);
							}
						},
					},
				});
			},
			'studiocms:sitemap': ({ setSitemap }) => {
				setSitemap({
					triggerSitemap: true,
					sitemaps: [{ pluginName: PACKAGE_NAME, sitemapXMLEndpointPath: resolve('./runtime/sitemap-route.js') }],
				});
			},
			'studiocms:dashboard': ({ setDashboard }) => {
				setDashboard({
					translations: { en: {} },
					// Lists the plugin under Plugins; the page itself is SettingsPage.astro (its own form).
					settingsPage: { fields: [], endpoint: resolve('./runtime/settings-onsave.js') },
				});
			},
		},
	});
}

export default tapestrySeo;
