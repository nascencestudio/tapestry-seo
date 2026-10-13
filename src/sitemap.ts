/**
 * The page sitemap (ADR 0001): every page visitors can see (Tapestry's `listPublicPages()`),
 * minus page types the admin left out and pages whose SEO settings say `noindex` or point their
 * canonical elsewhere (ADR 0002), with its last change and its translations as `hreflang` alternates. Everything put into the XML is escaped, and only http(s) URLs are written. Pure.
 */
import type { PageSeo } from './page-seo.js';
import type { SeoSettings } from './settings.js';

/** What the sitemap needs from a page (a subset of Tapestry's PublicPage). */
export interface SitemapPage {
	id: string;
	path: string;
	package: string;
	updatedAt: string | null;
	translations: ReadonlyArray<{ lang: string; path: string }>;
}

export interface SitemapEntry {
	loc: string;
	/** `YYYY-MM-DD`, or null. */
	lastmod: string | null;
	alternates: Array<{ hreflang: string; href: string }>;
}

export const escapeXml = (value: string) =>
	value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c);

/** An absolute http(s) URL for a path on the site, or null. */
function absolute(origin: string, path: string): string | null {
	try {
		const url = new URL(path, origin);
		return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === new URL(origin).origin
			? url.href
			: null;
	} catch {
		return null;
	}
}

const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function sitemapEntries(
	pages: readonly SitemapPage[],
	origin: string,
	settings: SeoSettings,
	pageSeo: ReadonlyMap<string, PageSeo> = new Map(),
): SitemapEntry[] {
	if (!settings.sitemap.enabled) return [];
	const excluded = new Set(settings.sitemap.excludedTypes);
	return pages.flatMap((page) => {
		if (excluded.has(page.package)) return [];
		const loc = absolute(origin, page.path);
		if (!loc) return [];
		const seo = pageSeo.get(page.id);
		// A sitemap lists the addresses to index: not hidden pages, not pages that point elsewhere.
		if (seo?.noindex || (seo?.canonical && seo.canonical !== loc)) return [];
		const lastmod = page.updatedAt && !Number.isNaN(Date.parse(page.updatedAt)) ? page.updatedAt.slice(0, 10) : null;
		const alternates = page.translations.flatMap((t) => {
			const href = absolute(origin, t.path);
			return href && LANG.test(t.lang) ? [{ hreflang: t.lang, href }] : [];
		});
		return [{ loc, lastmod, alternates: alternates.length > 1 ? alternates : [] }];
	});
}

export function buildSitemapXml(entries: readonly SitemapEntry[]): string {
	const urls = entries.map((entry) => {
		const parts = [`<loc>${escapeXml(entry.loc)}</loc>`];
		if (entry.lastmod) parts.push(`<lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
		for (const alt of entry.alternates) {
			parts.push(`<xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`);
		}
		return `<url>${parts.join('')}</url>`;
	});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...urls,
		'</urlset>',
		'',
	].join('\n');
}
