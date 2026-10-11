import { describe, expect, it } from 'vitest';
import { parseSettings } from '../src/settings.js';
import { buildSitemapXml, escapeXml, sitemapEntries } from '../src/sitemap.js';

const origin = 'https://example.com';
const page = (path: string, extra: Partial<Parameters<typeof sitemapEntries>[0][number]> = {}) => ({
	path,
	package: 'tapestry/canvas',
	updatedAt: '2026-10-02T10:20:30.000Z',
	translations: [],
	...extra,
});

describe('sitemap', () => {
	it('lists pages with absolute URLs and dates', () => {
		const entries = sitemapEntries([page('/'), page('/about')], origin, parseSettings({}));
		expect(entries).toEqual([
			{ loc: 'https://example.com/', lastmod: '2026-10-02', alternates: [] },
			{ loc: 'https://example.com/about', lastmod: '2026-10-02', alternates: [] },
		]);
	});

	it('adds translations as alternates', () => {
		const translations = [
			{ lang: 'en', path: '/about' },
			{ lang: 'fr', path: '/a-propos' },
		];
		const [entry] = sitemapEntries([page('/about', { translations })], origin, parseSettings({}));
		expect(entry?.alternates).toEqual([
			{ hreflang: 'en', href: 'https://example.com/about' },
			{ hreflang: 'fr', href: 'https://example.com/a-propos' },
		]);
		expect(buildSitemapXml(entry ? [entry] : [])).toContain(
			'<xhtml:link rel="alternate" hreflang="fr" href="https://example.com/a-propos"/>',
		);
	});

	it('respects the settings', () => {
		const pages = [page('/'), page('/notes', { package: 'studiocms/markdown' })];
		expect(sitemapEntries(pages, origin, parseSettings({ sitemap: { enabled: false } }))).toEqual([]);
		const entries = sitemapEntries(
			pages,
			origin,
			parseSettings({ sitemap: { excludedTypes: ['studiocms/markdown'] } }),
		);
		expect(entries.map((e) => e.loc)).toEqual(['https://example.com/']);
	});

	it('never writes other sites, other schemes or bad dates and languages', () => {
		const entries = sitemapEntries(
			[
				page('//evil.example/x'),
				page('javascript:alert(1)'),
				page('/ok', {
					updatedAt: 'not a date',
					translations: [
						{ lang: '"><x', path: '/ok' },
						{ lang: 'fr', path: '/fr' },
					],
				}),
			],
			origin,
			parseSettings({}),
		);
		expect(entries).toEqual([{ loc: 'https://example.com/ok', lastmod: null, alternates: [] }]);
	});

	it('escapes everything in the XML', () => {
		expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;');
		const xml = buildSitemapXml([{ loc: 'https://example.com/a?b=1&c=<2>', lastmod: null, alternates: [] }]);
		expect(xml).toContain('<loc>https://example.com/a?b=1&amp;c=&lt;2&gt;</loc>');
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});
});
