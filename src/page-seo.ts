/**
 * Per-page SEO settings (ADR 0002), edited in Tapestry's editor (the SEO button) and stored one
 * row per page. Empty values mean "use the page's own title and description" / "the site default".
 * Everything read or received is validated again: unknown keys are dropped, values are trimmed and
 * capped, images must be a media library id or an https URL, canonical URLs absolute http(s). Pure.
 */

export interface PageSeo {
	/** Search title, used as written (no site name added). Empty: the page title in the site's title format. */
	title: string;
	/** Search and link-preview description. Empty: the page's StudioCMS description, else the site default. */
	description: string;
	/** Link-preview image: a media library id (`m_…`) or an https URL. Null: the site default. */
	image: string | null;
	/** Keep search engines from indexing the page (`noindex`); also leaves it out of the sitemap. */
	noindex: boolean;
	/** Another address for this content (absolute http(s) URL). Empty: the page's own address. */
	canonical: string;
}

export const EMPTY_PAGE_SEO: PageSeo = { title: '', description: '', image: null, noindex: false, canonical: '' };

export const PAGE_SEO_LIMITS = { title: 200, description: 500, url: 2000 } as const;

/** Lengths search engines usually show in full; longer is allowed, the editor warns. */
export const RECOMMENDED = { title: 60, description: 160 } as const;

/** A media library item id (the same format the media library and Tapestry use). */
export const MEDIA_ID = /^m_[0-9a-z]{16}$/;

/** One line of text: control characters (line breaks included) become spaces, trimmed, capped. */
export function oneLine(value: unknown, max: number): string {
	if (typeof value !== 'string') return '';
	let text = '';
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		text += code < 0x20 || code === 0x7f ? ' ' : char;
	}
	return text.replace(/ {2,}/g, ' ').trim().slice(0, max);
}

/** An absolute URL with one of the given protocols (normalized), or null. */
export function absoluteUrl(value: unknown, protocols: readonly string[]): string | null {
	if (typeof value !== 'string' || !value.trim() || value.length > PAGE_SEO_LIMITS.url) return null;
	try {
		const url = new URL(value.trim());
		return protocols.includes(url.protocol) && !url.username && !url.password ? url.href : null;
	} catch {
		return null;
	}
}

export function parseImage(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (MEDIA_ID.test(trimmed)) return trimmed;
	return absoluteUrl(trimmed, ['https:']);
}

/** Stored or received settings (any JSON) → valid settings. */
export function parsePageSeo(raw: unknown): PageSeo {
	const root = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	return {
		title: oneLine(root.title, PAGE_SEO_LIMITS.title),
		description: oneLine(root.description, PAGE_SEO_LIMITS.description),
		image: parseImage(root.image),
		noindex: root.noindex === true,
		canonical: absoluteUrl(root.canonical, ['https:', 'http:']) ?? '',
	};
}

/** What was wrong with a submitted value, for the editor (null: fine). Silently dropping would surprise. */
export function pageSeoProblems(raw: unknown): Partial<Record<keyof PageSeo, string>> {
	const root = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	const problems: Partial<Record<keyof PageSeo, string>> = {};
	if (typeof root.image === 'string' && root.image.trim() && !parseImage(root.image)) {
		problems.image = 'Use an image from the media library or an https:// address.';
	}
	if (
		typeof root.canonical === 'string' &&
		root.canonical.trim() &&
		!absoluteUrl(root.canonical, ['https:', 'http:'])
	) {
		problems.canonical = 'Use a full address starting with https:// (or http://).';
	}
	return problems;
}

export const isEmptyPageSeo = (seo: PageSeo) =>
	!seo.title && !seo.description && !seo.image && !seo.noindex && !seo.canonical;
