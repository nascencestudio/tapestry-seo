import { describe, expect, it } from 'vitest';
import type { Bot } from '../src/bots.js';
import { applyPreset, DEFAULT_SETTINGS, isBlocked, parseSettings, settingsFromForm } from '../src/settings.js';

const bots: Bot[] = [
	{
		name: 'GPTBot',
		category: 'ai-training',
		operator: 'OpenAI',
		respects: 'yes',
		description: '',
		source: 'ai.robots.txt',
	},
	{
		name: 'CCBot',
		category: 'ai-training',
		operator: 'Common Crawl',
		respects: 'yes',
		description: '',
		source: 'ai.robots.txt',
	},
	{ name: 'AhrefsBot', category: 'seo', operator: 'Ahrefs', respects: 'yes', description: '', source: 'curated' },
];

describe('settings', () => {
	it('blocks nothing by default but keeps private paths private', () => {
		expect(bots.some((b) => isBlocked(b, DEFAULT_SETTINGS))).toBe(false);
		expect(DEFAULT_SETTINGS.robots.protectPrivate).toBe(true);
		expect(DEFAULT_SETTINGS.sitemap.enabled).toBe(true);
	});

	it('block covers the whole category, custom only the chosen bots', () => {
		const block = parseSettings({ robots: { categories: { 'ai-training': 'block' } } }, bots);
		expect(isBlocked(bots[0] as Bot, block)).toBe(true);
		expect(isBlocked(bots[1] as Bot, block)).toBe(true);
		const custom = parseSettings({ robots: { categories: { 'ai-training': 'custom' }, blocked: ['CCBot'] } }, bots);
		expect(isBlocked(bots[0] as Bot, custom)).toBe(false);
		expect(isBlocked(bots[1] as Bot, custom)).toBe(true);
		// One-by-one choices only count in custom categories.
		const allowed = parseSettings({ robots: { blocked: ['CCBot'] } }, bots);
		expect(isBlocked(bots[1] as Bot, allowed)).toBe(false);
	});

	it.each([
		null,
		'x',
		42,
		[],
		{ robots: 'no' },
		{ robots: { categories: { evil: 'block', seo: 'nuke' }, blocked: 'CCBot' } },
	])('falls back to safe values for %j', (raw) => {
		const s = parseSettings(raw, bots);
		expect(Object.values(s.robots.categories).every((m) => m === 'allow')).toBe(true);
		expect(s.robots.blocked).toEqual([]);
	});

	it('drops unknown bots and odd page types', () => {
		const s = parseSettings(
			{
				robots: { blocked: ['CCBot', 'Nope', 7] },
				sitemap: { excludedTypes: ['studiocms/markdown', '../x', '<b>', 3] },
			},
			bots,
		);
		expect(s.robots.blocked).toEqual(['CCBot']);
		expect(s.sitemap.excludedTypes).toEqual(['studiocms/markdown']);
	});

	it('reads the form, including presets', () => {
		const form = new URLSearchParams([
			['category.ai-training', 'custom'],
			['category.seo', 'block'],
			['bot', 'GPTBot'],
			['bot', 'Unknown'],
			['protectPrivate', 'on'],
			['extraRules', 'Disallow: /tmp/\r\n'],
			['sitemapExclude', 'studiocms/markdown'],
		]);
		const s = settingsFromForm(form, bots);
		expect(s.robots.categories['ai-training']).toBe('custom');
		expect(s.robots.categories.seo).toBe('block');
		expect(s.robots.blocked).toEqual(['GPTBot']);
		expect(s.robots.extraRules).toBe('Disallow: /tmp/\n');
		expect(s.sitemap).toEqual({ enabled: false, excludedTypes: ['studiocms/markdown'] });
		form.set('preset', 'no-ai');
		const preset = settingsFromForm(form, bots);
		expect(preset.robots.categories['ai-training']).toBe('block');
		expect(preset.robots.categories.seo).toBe('allow');
	});

	it('ignores unknown presets', () => {
		expect(applyPreset(DEFAULT_SETTINGS, 'nope' as never)).toBe(DEFAULT_SETTINGS);
	});
});
