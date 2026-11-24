import { describe, expect, it } from 'vitest';
import { categoryFor, operatorFor, plain, respectsFor } from '../scripts/bot-fields.mjs';
import { AI_BOTS } from '../src/data/ai-bots.js';

describe('operatorFor', () => {
	it('keeps a plain name and cuts a sentence at its first clause', () => {
		expect(operatorFor('OpenAI')).toBe('OpenAI');
		expect(operatorFor('Google that retrieves web content for Gemini')).toBe('Google');
		expect(operatorFor('Ai2, a non-profit research institute')).toBe('Ai2');
		expect(operatorFor('[Kimi](https://kimi.ai)')).toBe('Kimi');
	});

	it('turns a URL into its site name', () => {
		expect(operatorFor('https://www.example.com/bot')).toBe('Example');
	});

	it('names the operator of a known crawler when upstream is unclear', () => {
		expect(operatorFor('Unclear at this time.', 'Claude-Agent')).toBe('Anthropic');
		expect(operatorFor('Unclear at this time.', 'Codex')).toBe('OpenAI');
		expect(operatorFor('', 'Grok Bot')).toBe('xAI');
		expect(operatorFor('Unknown', 'Google-Agent')).toBe('Google');
	});

	it('matches override names case-insensitively, like robots.txt', () => {
		expect(operatorFor('Unclear at this time.', 'meta-externalfetcher')).toBe('Meta');
		expect(operatorFor('Unclear at this time.', 'webzio-extended')).toBe('Webz.io');
	});

	it('lets an upstream answer win over the override', () => {
		expect(operatorFor('Anthropic PBC', 'Codex')).toBe('Anthropic PBC');
	});

	it('stays Unknown for an unclear crawler without an override', () => {
		expect(operatorFor('Unclear at this time.', 'SomeNewBot')).toBe('Unknown');
		expect(operatorFor(undefined)).toBe('Unknown');
	});
});

describe('categoryFor', () => {
	it('maps free text to a category', () => {
		expect(categoryFor('AI search')).toBe('ai-search');
		expect(categoryFor('AI agents acting on behalf of users')).toBe('ai-assistants');
		expect(categoryFor('Scrapes data to train LLMs')).toBe('ai-training');
		expect(categoryFor('Unclear at this time.')).toBe('ai-other');
	});

	it('applies the reviewed overrides', () => {
		expect(categoryFor('AI search', 'Applebot-Extended')).toBe('ai-training');
	});
});

describe('respectsFor and plain', () => {
	it('reads yes/no and strips Markdown links', () => {
		expect(respectsFor('Yes')).toBe('yes');
		expect(respectsFor('[No](https://example.com)')).toBe('no');
		expect(respectsFor('Unclear at this time.')).toBe('unknown');
		expect(plain(' [A](https://a.example)\n b ')).toBe('A b');
	});
});

describe('generated list', () => {
	it('was generated with the operator overrides (checked for the crawlers it still lists)', () => {
		const byName = new Map(AI_BOTS.map((b) => [b.name.toLowerCase(), b]));
		for (const [name, operator] of [
			['claude-agent', 'Anthropic'],
			['codex', 'OpenAI'],
			['grok bot', 'xAI'],
		] as const) {
			const bot = byName.get(name);
			if (bot) expect(bot.operator).toBe(operator);
		}
	});
});
