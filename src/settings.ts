/**
 * The admin settings (Plugins → Tapestry SEO), stored as one JSON row in StudioCMS's plugin data
 * table (runtime/settings-store.ts). Each crawler category is allowed, blocked (including bots
 * added to that category by later releases) or chosen bot by bot. Everything read back is
 * validated again: unknown categories, bots and keys are dropped. Pure.
 */
import { BOTS, type Bot, CATEGORY_IDS, type CategoryId, isCategory } from './bots.js';
import { oneLine, PAGE_SEO_LIMITS, parseImage } from './page-seo.js';

export type CategoryMode = 'allow' | 'block' | 'custom';
const MODES: readonly CategoryMode[] = ['allow', 'block', 'custom'];

export interface SeoSettings {
	robots: {
		categories: Record<CategoryId, CategoryMode>;
		/** Bots blocked one by one (only used in categories set to `custom`). */
		blocked: string[];
		/** Keep all crawlers out of the dashboard and the plugins' APIs. */
		protectPrivate: boolean;
		/** Extra robots.txt lines, added as written (validated: robots.ts). */
		extraRules: string;
	};
	sitemap: {
		enabled: boolean;
		/** Page types (`studiocms/markdown`…) left out of the sitemap. */
		excludedTypes: string[];
	};
	/** Used by `<Seo>` when a page doesn't set its own (ADR 0002). */
	defaults: SiteDefaults;
}

export interface SiteDefaults {
	/** For titles (`{site}`) and `og:site_name`. Empty: titles are just the page title. */
	siteName: string;
	/** How page titles are written: `{page}` is the page title, `{site}` the site name. */
	titleFormat: string;
	/** For pages without a description of their own. */
	description: string;
	/** Link-preview image for pages without one: a media library id or an https URL. */
	image: string | null;
}

export const DEFAULT_TITLE_FORMAT = '{page} | {site}';
export const DEFAULT_SITE_DEFAULTS: SiteDefaults = {
	siteName: '',
	titleFormat: DEFAULT_TITLE_FORMAT,
	description: '',
	image: null,
};
const MAX_SITE_NAME = 100;
const MAX_TITLE_FORMAT = 100;

const allow = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 'allow'])) as Record<CategoryId, CategoryMode>;

/** Nothing blocked until an admin chooses (installing the plugin changes no crawler's access). */
export const DEFAULT_SETTINGS: SeoSettings = {
	robots: { categories: allow, blocked: [], protectPrivate: true, extraRules: '' },
	sitemap: { enabled: true, excludedTypes: [] },
	defaults: DEFAULT_SITE_DEFAULTS,
};

export const PRESETS = [
	{ id: 'open', label: 'Allow all crawlers', categories: {} },
	{ id: 'no-ai-training', label: 'Block AI training', categories: { 'ai-training': 'block' } },
	{
		id: 'no-ai',
		label: 'Block all AI crawlers',
		categories: { 'ai-training': 'block', 'ai-search': 'block', 'ai-assistants': 'block', 'ai-other': 'block' },
	},
	{
		id: 'no-ai-seo',
		label: 'Block AI crawlers and SEO tools',
		categories: {
			'ai-training': 'block',
			'ai-search': 'block',
			'ai-assistants': 'block',
			'ai-other': 'block',
			seo: 'block',
		},
	},
] as const satisfies ReadonlyArray<{
	id: string;
	label: string;
	categories: Partial<Record<CategoryId, CategoryMode>>;
}>;

export type PresetId = (typeof PRESETS)[number]['id'];

/** A page type id as StudioCMS uses them, e.g. `studiocms/markdown`, `tapestry/canvas`. */
const PAGE_TYPE = /^[a-z0-9@][a-z0-9@._/-]{0,99}$/i;
export const MAX_EXTRA_RULES = 10_000;

/** Whether a crawler ends up blocked with these settings. */
export function isBlocked(bot: Pick<Bot, 'name' | 'category'>, settings: SeoSettings): boolean {
	const mode = settings.robots.categories[bot.category];
	if (mode === 'block') return true;
	if (mode === 'custom') return settings.robots.blocked.includes(bot.name);
	return false;
}

const unique = (values: Iterable<string>) => [...new Set(values)];

/** Stored settings (any JSON) → valid settings; anything unknown or malformed falls back to the defaults. */
export function parseSettings(raw: unknown, bots: readonly Bot[] = BOTS): SeoSettings {
	const known = new Set(bots.map((b) => b.name));
	const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const robots = root.robots && typeof root.robots === 'object' ? (root.robots as Record<string, unknown>) : {};
	const sitemap = root.sitemap && typeof root.sitemap === 'object' ? (root.sitemap as Record<string, unknown>) : {};
	const defaults = root.defaults && typeof root.defaults === 'object' ? (root.defaults as Record<string, unknown>) : {};
	const categories = { ...allow };
	if (robots.categories && typeof robots.categories === 'object') {
		for (const [id, mode] of Object.entries(robots.categories as Record<string, unknown>)) {
			if (isCategory(id) && MODES.includes(mode as CategoryMode)) categories[id] = mode as CategoryMode;
		}
	}
	return {
		robots: {
			categories,
			blocked: Array.isArray(robots.blocked)
				? unique(robots.blocked.filter((n): n is string => typeof n === 'string' && known.has(n)))
				: [],
			protectPrivate: typeof robots.protectPrivate === 'boolean' ? robots.protectPrivate : true,
			extraRules: typeof robots.extraRules === 'string' ? robots.extraRules.slice(0, MAX_EXTRA_RULES) : '',
		},
		sitemap: {
			enabled: typeof sitemap.enabled === 'boolean' ? sitemap.enabled : true,
			excludedTypes: Array.isArray(sitemap.excludedTypes)
				? unique(sitemap.excludedTypes.filter((t): t is string => typeof t === 'string' && PAGE_TYPE.test(t)))
				: [],
		},
		defaults: parseDefaults(defaults),
	};
}

function parseDefaults(raw: Record<string, unknown>): SiteDefaults {
	const format = oneLine(raw.titleFormat, MAX_TITLE_FORMAT);
	return {
		siteName: oneLine(raw.siteName, MAX_SITE_NAME),
		// Without {page} every page would get the same title.
		titleFormat: format.includes('{page}') ? format : DEFAULT_TITLE_FORMAT,
		description: oneLine(raw.description, PAGE_SEO_LIMITS.description),
		image: parseImage(raw.image),
	};
}

/** Settings with a preset's category choices (other categories allowed; one-by-one choices kept). */
export function applyPreset(settings: SeoSettings, preset: PresetId): SeoSettings {
	const chosen = PRESETS.find((p) => p.id === preset);
	if (!chosen) return settings;
	const categories = { ...allow, ...(chosen.categories as Partial<Record<CategoryId, CategoryMode>>) };
	return { ...settings, robots: { ...settings.robots, categories } };
}

/** The settings form (SettingsPage.astro) → settings. Field names are documented on the page. */
export function settingsFromForm(form: URLSearchParams, bots: readonly Bot[] = BOTS): SeoSettings {
	const categories = { ...allow };
	for (const id of CATEGORY_IDS) {
		const mode = form.get(`category.${id}`);
		if (MODES.includes(mode as CategoryMode)) categories[id] = mode as CategoryMode;
	}
	const raw = {
		robots: {
			categories,
			blocked: form.getAll('bot'),
			protectPrivate: form.get('protectPrivate') === 'on',
			extraRules: (form.get('extraRules') ?? '').replace(/\r\n?/g, '\n'),
		},
		sitemap: { enabled: form.get('sitemap') === 'on', excludedTypes: form.getAll('sitemapExclude') },
		defaults: {
			siteName: form.get('defaults.siteName') ?? '',
			titleFormat: form.get('defaults.titleFormat') ?? '',
			description: form.get('defaults.description') ?? '',
			image: form.get('defaults.image') ?? '',
		},
	};
	const settings = parseSettings(raw, bots);
	const preset = form.get('preset');
	return preset ? applyPreset(settings, preset as PresetId) : settings;
}
