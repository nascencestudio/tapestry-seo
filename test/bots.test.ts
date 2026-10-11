import { describe, expect, it } from 'vitest';
import { BOT_NAME, BOTS, CATEGORY_IDS, isCategory } from '../src/bots.js';
import { AI_BOTS, AI_BOTS_SOURCE } from '../src/data/ai-bots.js';
import { CURATED_BOTS } from '../src/data/curated-bots.js';

describe('bundled crawler list', () => {
	it('has only safe robots.txt tokens (no line breaks, no colons)', () => {
		for (const bot of BOTS) expect(bot.name, bot.name).toMatch(BOT_NAME);
	});

	it('has no duplicates (case-insensitive) and only known categories', () => {
		const names = BOTS.map((b) => b.name.toLowerCase());
		expect(new Set(names).size).toBe(names.length);
		for (const bot of BOTS) expect(isCategory(bot.category), bot.name).toBe(true);
		for (const bot of AI_BOTS) expect(bot.category.startsWith('ai-'), bot.name).toBe(true);
	});

	it('covers every category and records where the AI list came from', () => {
		for (const id of CATEGORY_IDS)
			expect(
				BOTS.some((b) => b.category === id),
				id,
			).toBe(true);
		expect(AI_BOTS_SOURCE.repository).toBe('https://github.com/ai-robots-txt/ai.robots.txt');
		expect(AI_BOTS.length).toBeGreaterThan(100);
		expect(CURATED_BOTS.find((b) => b.name === 'Googlebot')?.category).toBe('search');
	});

	it.each(['GPTBot\nDisallow:', 'Evil: bot', ' leading', '', 'x'.repeat(81), 'bot\r', '名前'])(
		'refuses %j as a token',
		(name) => {
			expect(BOT_NAME.test(name)).toBe(false);
		},
	);
});
