/**
 * What the SEO dialog's previews show (ADR 0002): the title and description `<Seo>` will write for
 * the current values, shortened roughly where search results cut them, and the address as a
 * breadcrumb. The same rules as meta.ts, so the preview matches the page. Pure.
 */
import { formatTitle } from '../meta.js';
import type { PageSeo } from '../page-seo.js';
import type { SiteDefaults } from '../settings.js';

export interface PreviewPage {
	title: string;
	description: string;
	path: string;
}

export const effectiveTitle = (seo: PageSeo, page: PreviewPage, defaults: SiteDefaults) =>
	seo.title.trim() || formatTitle(page.title, defaults);

export const effectiveDescription = (seo: PageSeo, page: PreviewPage, defaults: SiteDefaults) =>
	seo.description.trim() || page.description.trim() || defaults.description;

/** Shortened at a word boundary with "…" when longer than `max` characters. */
export function truncate(text: string, max: number): string {
	const value = text.trim();
	if (value.length <= max) return value;
	const cut = value.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** `https://example.com/about/team?x` → `example.com › about › team`. */
export function breadcrumb(origin: string, path: string): string {
	try {
		const url = new URL(path, origin);
		const parts = url.pathname
			.split('/')
			.filter(Boolean)
			.map((part) => {
				try {
					return decodeURIComponent(part);
				} catch {
					return part;
				}
			});
		return [url.host, ...parts].join(' › ');
	} catch {
		return origin;
	}
}

/** The host for the link-preview card, e.g. `example.com`. */
export function host(origin: string): string {
	try {
		return new URL(origin).host;
	} catch {
		return origin;
	}
}
