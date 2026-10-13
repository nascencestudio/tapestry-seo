/**
 * The page sitemap, registered through StudioCMS's sitemap hook (served at
 * `/sitemap-<plugin>.xml` and listed in `/sitemap-index.xml`): every page visitors can see,
 * from Tapestry's `listPublicPages()`, minus page types the admin left out and pages hidden or moved by
 * their SEO settings. Public; cached
 * briefly. ADR 0001.
 */
import { listPublicPages } from '@nascencestudio/tapestry/page';
import type { APIRoute } from 'astro';
import { buildSitemapXml, sitemapEntries } from '../sitemap.js';
import { loadAllPageSeo } from './page-seo-store.js';
import { loadSeoSettings } from './settings-store.js';
import { siteOrigin } from './site.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const [pages, settings, pageSeo] = await Promise.all([listPublicPages(), loadSeoSettings(), loadAllPageSeo()]);
	return new Response(buildSitemapXml(sitemapEntries(pages, siteOrigin(context), settings, pageSeo)), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300',
			'X-Content-Type-Options': 'nosniff',
		},
	});
};
