/// <reference types="studiocms/v/types" />
/**
 * Facts about the site the generated files need: its public origin (the Astro `site` option,
 * else the request's), the private paths robots.txt keeps crawlers out of, and the sitemap's
 * address. Server only.
 */
import { StudioCMSRoutes } from 'studiocms:lib';
import type { APIContext } from 'astro';
import type { RobotsContext } from '../robots.js';

/** Plugin APIs and StudioCMS's API: never useful to crawlers. Public files (`/files/…`) stay crawlable. */
const API_PATHS = ['/studiocms_api/', '/_tapestry/', '/_media/', '/_seo/'];

export function siteOrigin(context: Pick<APIContext, 'site' | 'url'>): string {
	return (context.site ?? context.url).origin;
}

export function robotsContext(context: Pick<APIContext, 'site' | 'url'>): RobotsContext {
	const dashboard = `${StudioCMSRoutes.mainLinks.dashboardIndex.replace(/\/+$/, '')}/`;
	return {
		// StudioCMS's sitemap index, which lists this plugin's page sitemap (and any other plugin's).
		sitemapUrl: new URL('/sitemap-index.xml', siteOrigin(context)).href,
		privatePaths: [dashboard, ...API_PATHS],
	};
}
