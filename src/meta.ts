/**
 * The meta tags for a page (ADR 0002): what `<Seo>` writes into `<head>`. Rules:
 * - title: the page's own SEO title as written, else its StudioCMS title in the site's title format;
 * - description: the page's SEO description, else its StudioCMS description, else the site default;
 * - canonical: the page's custom canonical, else its own address on the site (no query string), except
 *   on `noindex` routes (a hidden page or a 404 shouldn't name an address of its own);
 * - robots `noindex`: when the page asks for it (drafts already get `X-Robots-Tag` from Tapestry);
 * - link previews (Open Graph, Twitter): the same title and description, the page's image or the
 *   site default (only raster images crawlers can show), the site name, the language;
 * - `hreflang` alternates: the page's visible translations, plus `x-default` (the first language).
 * Values are returned raw; Astro escapes them when writing attributes. Pure.
 */
import type { PageSeo } from './page-seo.js';
import type { SiteDefaults } from './settings.js';

export interface MetaPage {
	/** StudioCMS title and description. */
	title: string;
	description: string;
	/** The page's path on the site, e.g. `/about`. */
	path: string;
	/** BCP 47 language of the page (translated sites), else null. */
	lang: string | null;
	/** Visible language versions including this one (from getPage()), else []. */
	translations: ReadonlyArray<{ lang: string; path: string }>;
}

/** A link-preview image, resolved to an absolute URL. */
export interface MetaImage {
	url: string;
	width: number | null;
	height: number | null;
	alt: string;
}

export interface Meta {
	title: string;
	description: string;
	/** Null on `noindex` routes without a custom canonical. */
	canonical: string | null;
	robots: string | null;
	/** `<meta property="og:…">` pairs, in order. */
	openGraph: Array<[string, string]>;
	/** `<meta name="twitter:…">` pairs, in order. */
	twitter: Array<[string, string]>;
	alternates: Array<{ hreflang: string; href: string }>;
}

/** Page title in the site's format: `{page} | {site}` → "About | Nascence Studio". */
export function formatTitle(pageTitle: string, defaults: Pick<SiteDefaults, 'siteName' | 'titleFormat'>): string {
	const page = pageTitle.trim();
	if (!defaults.siteName) return page || '';
	if (!page) return defaults.siteName;
	// Replace both placeholders in one pass, so a title containing "{site}" stays as written.
	return defaults.titleFormat.replace(/\{(page|site)\}/g, (_, key: string) =>
		key === 'page' ? page : defaults.siteName,
	);
}

const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** `en-GB` → `en_GB` (Open Graph's locale format). */
const ogLocale = (lang: string) => lang.replace('-', '_');

function onSite(origin: string, path: string): string | null {
	try {
		const url = new URL(path, origin);
		if (url.origin !== new URL(origin).origin) return null;
		url.search = '';
		url.hash = '';
		return url.href;
	} catch {
		return null;
	}
}

export function buildMeta(input: {
	page: MetaPage;
	seo: PageSeo | null;
	defaults: SiteDefaults;
	/** The site's public origin, e.g. `https://example.com`. */
	origin: string;
	/** The page's or the default image, already resolved (see `previewImage()`); null: none. */
	image: MetaImage | null;
}): Meta {
	const { page, seo, defaults, origin, image } = input;
	const title = seo?.title || formatTitle(page.title, defaults);
	const description = seo?.description || page.description.trim() || defaults.description;
	const own = onSite(origin, page.path) ?? new URL('/', origin).href;
	const canonical = seo?.canonical || (seo?.noindex ? null : own);

	// Only for pages with two or more visible language versions; x-default is the first (default) language.
	const versions = page.translations.flatMap((t) => {
		const href = onSite(origin, t.path);
		return href && LANG.test(t.lang) ? [{ hreflang: t.lang, href }] : [];
	});
	const alternates =
		versions.length > 1 ? [...versions, { hreflang: 'x-default', href: versions[0]?.href ?? own }] : [];

	const openGraph: Array<[string, string]> = [
		['og:type', 'website'],
		['og:title', title],
		...(description ? [['og:description', description] as [string, string]] : []),
		['og:url', canonical ?? own],
		...(defaults.siteName ? [['og:site_name', defaults.siteName] as [string, string]] : []),
		...(page.lang && LANG.test(page.lang) ? [['og:locale', ogLocale(page.lang)] as [string, string]] : []),
	];
	const twitter: Array<[string, string]> = [['twitter:card', image ? 'summary_large_image' : 'summary']];
	if (image) {
		openGraph.push(['og:image', image.url]);
		if (image.width && image.height) {
			openGraph.push(['og:image:width', String(image.width)], ['og:image:height', String(image.height)]);
		}
		if (image.alt) openGraph.push(['og:image:alt', image.alt]);
		twitter.push(['twitter:image', image.url]);
		if (image.alt) twitter.push(['twitter:image:alt', image.alt]);
	}

	return {
		title,
		description,
		canonical,
		robots: seo?.noindex ? 'noindex, follow' : null,
		openGraph,
		twitter,
		alternates,
	};
}

/** Image types link previews can show (no SVG). */
const PREVIEW_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * A stored image value (media id or https URL) → a preview image. `item` is the media library's
 * item for a media id (null when it no longer exists or isn't an image link previews can show).
 */
export function previewImage(
	value: string | null,
	origin: string,
	item: { kind: string; mime: string; url: string; width: number | null; height: number | null; alt: string } | null,
): MetaImage | null {
	if (!value) return null;
	if (value.startsWith('https:')) return { url: value, width: null, height: null, alt: '' };
	if (item?.kind !== 'image' || !PREVIEW_TYPES.has(item.mime)) return null;
	try {
		return { url: new URL(item.url, origin).href, width: item.width, height: item.height, alt: item.alt };
	} catch {
		return null;
	}
}
