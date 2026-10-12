import { describe, expect, it } from 'vitest';
import { buildMeta, formatTitle, type MetaPage, previewImage } from '../src/meta.js';
import { EMPTY_PAGE_SEO, PAGE_SEO_LIMITS, pageSeoProblems, parsePageSeo } from '../src/page-seo.js';
import { DEFAULT_TITLE_FORMAT, parseSettings, settingsFromForm } from '../src/settings.js';
import { sitemapEntries } from '../src/sitemap.js';

const origin = 'https://example.com';
const defaults = {
	siteName: 'Nascence Studio',
	titleFormat: '{page} | {site}',
	description: 'Site default',
	image: null,
};
const page = (extra: Partial<MetaPage> = {}): MetaPage => ({
	title: 'About',
	description: 'About us',
	path: '/about',
	lang: null,
	translations: [],
	...extra,
});
const og = (meta: ReturnType<typeof buildMeta>) => Object.fromEntries(meta.openGraph);

describe('page SEO settings', () => {
	it('keep valid values, trimmed', () => {
		expect(
			parsePageSeo({
				title: '  Hello ',
				description: 'World',
				image: 'm_0123456789abcdef',
				noindex: true,
				canonical: 'https://other.example/x',
			}),
		).toEqual({
			title: 'Hello',
			description: 'World',
			image: 'm_0123456789abcdef',
			noindex: true,
			canonical: 'https://other.example/x',
		});
	});

	it.each([
		['javascript: canonical', { canonical: 'javascript:alert(1)' }, { canonical: '' }],
		['data: image', { image: 'data:image/png;base64,AAAA' }, { image: null }],
		['http image (link previews need https)', { image: 'http://example.com/a.png' }, { image: null }],
		['credentials in a URL', { canonical: 'https://user:pw@example.com/' }, { canonical: '' }],
		['a relative canonical', { canonical: '/about' }, { canonical: '' }],
		['a malformed media id', { image: 'm_../../etc' }, { image: null }],
		['noindex as a string', { noindex: 'true' }, { noindex: false }],
		['control characters', { title: 'a\u0000b\nc' }, { title: 'a b c' }],
	])('drop or clean %s', (_, raw, expected) => {
		expect(parsePageSeo(raw)).toEqual({ ...EMPTY_PAGE_SEO, ...expected });
	});

	it('cap lengths and ignore unknown keys and non-objects', () => {
		const long = parsePageSeo({ title: 'x'.repeat(1000), extra: 1 });
		expect(long.title).toHaveLength(PAGE_SEO_LIMITS.title);
		expect(long).not.toHaveProperty('extra');
		expect(parsePageSeo('nope')).toEqual(EMPTY_PAGE_SEO);
		expect(parsePageSeo([1, 2])).toEqual(EMPTY_PAGE_SEO);
	});

	it('explain rejected images and canonicals instead of dropping them silently', () => {
		expect(pageSeoProblems({ image: 'ftp://x', canonical: 'nope' })).toEqual({
			image: expect.stringContaining('https://'),
			canonical: expect.stringContaining('https://'),
		});
		expect(pageSeoProblems({ image: '', canonical: '' })).toEqual({});
	});
});

describe('site defaults', () => {
	it('come from the settings form; a format without {page} falls back', () => {
		const form = new URLSearchParams({
			'defaults.siteName': ' Nascence ',
			'defaults.titleFormat': 'Only the site',
			'defaults.description': 'Hi',
			'defaults.image': 'https://example.com/og.png',
		});
		expect(settingsFromForm(form).defaults).toEqual({
			siteName: 'Nascence',
			titleFormat: DEFAULT_TITLE_FORMAT,
			description: 'Hi',
			image: 'https://example.com/og.png',
		});
		expect(parseSettings({}).defaults.siteName).toBe('');
	});
});

describe('titles', () => {
	it('use the format, or just the page title without a site name', () => {
		expect(formatTitle('About', defaults)).toBe('About | Nascence Studio');
		expect(formatTitle('About', { ...defaults, titleFormat: '{site} — {page}' })).toBe('Nascence Studio — About');
		expect(formatTitle('About', { ...defaults, siteName: '' })).toBe('About');
		expect(formatTitle('', defaults)).toBe('Nascence Studio');
	});

	it('keep placeholders inside a page title as written', () => {
		expect(formatTitle('Use {site} here', defaults)).toBe('Use {site} here | Nascence Studio');
	});
});

describe('meta tags', () => {
	it('fall back to the page and the site defaults', () => {
		const meta = buildMeta({ page: page(), seo: null, defaults, origin, image: null });
		expect(meta).toMatchObject({
			title: 'About | Nascence Studio',
			description: 'About us',
			canonical: 'https://example.com/about',
			robots: null,
			alternates: [],
		});
		expect(og(meta)).toMatchObject({ 'og:title': 'About | Nascence Studio', 'og:site_name': 'Nascence Studio' });
		expect(Object.fromEntries(meta.twitter)).toEqual({ 'twitter:card': 'summary' });
		expect(buildMeta({ page: page({ description: '' }), seo: null, defaults, origin, image: null }).description).toBe(
			'Site default',
		);
	});

	it('use the page settings as written', () => {
		const seo = { title: 'Custom', description: 'Desc', image: null, noindex: true, canonical: 'https://x.example/a' };
		const meta = buildMeta({ page: page(), seo, defaults, origin, image: null });
		expect(meta).toMatchObject({
			title: 'Custom',
			description: 'Desc',
			canonical: 'https://x.example/a',
			robots: 'noindex, follow',
		});
		expect(og(meta)['og:url']).toBe('https://x.example/a');
	});

	it('leave out the self-canonical on hidden routes, keep a custom one', () => {
		const hidden = { ...EMPTY_PAGE_SEO, noindex: true };
		expect(buildMeta({ page: page(), seo: hidden, defaults, origin, image: null }).canonical).toBeNull();
		const moved = { ...hidden, canonical: 'https://x.example/a' };
		expect(buildMeta({ page: page(), seo: moved, defaults, origin, image: null }).canonical).toBe(
			'https://x.example/a',
		);
	});

	it('drop the query string from the canonical', () => {
		const meta = buildMeta({ page: page({ path: '/about?utm=x#top' }), seo: null, defaults, origin, image: null });
		expect(meta.canonical).toBe('https://example.com/about');
	});

	it('add image tags and a large card only with an image', () => {
		const image = { url: 'https://example.com/files/a.jpg', width: 1200, height: 630, alt: 'A view' };
		const meta = buildMeta({ page: page(), seo: null, defaults, origin, image });
		expect(og(meta)).toMatchObject({
			'og:image': image.url,
			'og:image:width': '1200',
			'og:image:height': '630',
			'og:image:alt': 'A view',
		});
		expect(Object.fromEntries(meta.twitter)).toEqual({
			'twitter:card': 'summary_large_image',
			'twitter:image': image.url,
			'twitter:image:alt': 'A view',
		});
	});

	it('list language versions on this site with x-default, and set the locale', () => {
		const translations = [
			{ lang: 'en', path: '/about' },
			{ lang: 'fr-CA', path: '/fr/about' },
			{ lang: 'de', path: 'https://evil.example/de' },
			{ lang: 'not a lang', path: '/x' },
		];
		const meta = buildMeta({ page: page({ lang: 'fr-CA', translations }), seo: null, defaults, origin, image: null });
		expect(meta.alternates).toEqual([
			{ hreflang: 'en', href: 'https://example.com/about' },
			{ hreflang: 'fr-CA', href: 'https://example.com/fr/about' },
			{ hreflang: 'x-default', href: 'https://example.com/about' },
		]);
		expect(og(meta)['og:locale']).toBe('fr_CA');
		// One visible version: no alternates.
		const single = buildMeta({
			page: page({ translations: [{ lang: 'en', path: '/about' }] }),
			seo: null,
			defaults,
			origin,
			image: null,
		});
		expect(single.alternates).toEqual([]);
	});

	it('return text raw (Astro escapes attributes)', () => {
		const seo = { ...EMPTY_PAGE_SEO, title: '"><script>alert(1)</script>' };
		expect(buildMeta({ page: page(), seo, defaults, origin, image: null }).title).toBe('"><script>alert(1)</script>');
	});
});

describe('preview images', () => {
	const item = { kind: 'image', mime: 'image/jpeg', url: '/files/a.jpg', width: 800, height: 400, alt: 'Alt' };

	it('resolve media items to absolute URLs and keep https URLs', () => {
		expect(previewImage('m_0123456789abcdef', origin, item)).toEqual({
			url: 'https://example.com/files/a.jpg',
			width: 800,
			height: 400,
			alt: 'Alt',
		});
		expect(previewImage('https://cdn.example/x.png', origin, null)?.url).toBe('https://cdn.example/x.png');
	});

	it('skip missing items, videos and SVG (link previews can’t show them)', () => {
		expect(previewImage('m_0123456789abcdef', origin, null)).toBeNull();
		expect(previewImage('m_0123456789abcdef', origin, { ...item, mime: 'image/svg+xml' })).toBeNull();
		expect(previewImage('m_0123456789abcdef', origin, { ...item, kind: 'video' })).toBeNull();
		expect(previewImage(null, origin, item)).toBeNull();
	});
});

describe('sitemap and page settings', () => {
	const pages = ['/', '/hidden', '/moved', '/same'].map((path) => ({
		id: path,
		path,
		package: 'tapestry/canvas',
		updatedAt: null,
		translations: [],
	}));

	it('leave out noindex pages and pages whose canonical points elsewhere', () => {
		const seo = new Map([
			['/hidden', { ...EMPTY_PAGE_SEO, noindex: true }],
			['/moved', { ...EMPTY_PAGE_SEO, canonical: 'https://example.com/elsewhere' }],
			['/same', { ...EMPTY_PAGE_SEO, canonical: 'https://example.com/same' }],
		]);
		expect(sitemapEntries(pages, origin, parseSettings({}), seo).map((e) => e.loc)).toEqual([
			'https://example.com/',
			'https://example.com/same',
		]);
	});
});

describe('dialog previews', async () => {
	const { breadcrumb, effectiveDescription, effectiveTitle, truncate } = await import('../src/editor/preview.js');
	const previewPage = { title: 'About', description: '', path: '/about/team' };

	it('show what <Seo> will write', () => {
		expect(effectiveTitle(EMPTY_PAGE_SEO, previewPage, defaults)).toBe('About | Nascence Studio');
		expect(effectiveTitle({ ...EMPTY_PAGE_SEO, title: ' Own ' }, previewPage, defaults)).toBe('Own');
		expect(effectiveDescription(EMPTY_PAGE_SEO, previewPage, defaults)).toBe('Site default');
	});

	it('shorten at a word boundary and show the address as a breadcrumb', () => {
		expect(truncate('short', 60)).toBe('short');
		expect(truncate('one two three four five six seven', 20)).toBe('one two three four…');
		expect(truncate('x'.repeat(30), 10)).toBe(`${'x'.repeat(9)}…`);
		expect(breadcrumb(origin, '/about/team?x=1')).toBe('example.com › about › team');
		expect(breadcrumb(origin, '/caf%C3%A9')).toBe('example.com › café');
		expect(breadcrumb(origin, '/')).toBe('example.com');
	});
});
