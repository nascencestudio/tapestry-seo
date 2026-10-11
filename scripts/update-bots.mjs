// Refreshes src/data/ai-bots.ts from ai.robots.txt (https://github.com/ai-robots-txt/ai.robots.txt,
// MIT) and its license (licenses/ai.robots.txt-LICENSE). Run by hand (`pnpm update-bots`) or by the
// weekly GitHub workflow, which opens a pull request with the changes for review. The site never
// fetches the list itself: each release ships the reviewed copy (ADR 0001).
//
// What it does with each entry: maps the free-text "function" to one of our categories, maps
// "respect" to yes/no/unknown, strips Markdown links from the text, and drops (with a warning)
// names that aren't safe robots.txt tokens or that are already in our curated list.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'ai-robots-txt/ai.robots.txt';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const root = join(import.meta.dirname, '..');

/** Same rule as BOT_NAME in src/bots.ts. */
const BOT_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._\-/]{0,79}$/;

const getJson = async (url) => {
	const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'tapestry-seo-update' } });
	if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
	return response.json();
};
const getText = async (url) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
	return response.text();
};

/** `[Text](https://…)` → `Text`; whitespace collapsed. */
const plain = (value) =>
	String(value ?? '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();

const UNCLEAR = /^unclear|^unknown|^n\/a$/i;

/**
 * Upstream's "operator" is sometimes a sentence ("Google that retrieves web content…", "Ai2, a
 * non-profit…") or a URL. Keep the name: a URL becomes its site's name, a sentence is cut at the
 * first clause.
 */
export function operatorFor(value) {
	const text = plain(value);
	if (!text || UNCLEAR.test(text)) return 'Unknown';
	if (/^https?:\/\//i.test(text)) {
		try {
			const labels = new URL(text).hostname.replace(/^www\./, '').split('.');
			const name = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
			return name ? name[0].toUpperCase() + name.slice(1) : 'Unknown';
		} catch {
			return 'Unknown';
		}
	}
	const cut = text.split(/,\s|\s(?:that|to|which|used for)\s|\s\(|\.\s/)[0]?.trim() ?? '';
	return cut ? cut.slice(0, 60) : 'Unknown';
}

/**
 * Reviewed corrections where the free-text mapping gets a well-known crawler wrong. Keep it short
 * and say why.
 */
const CATEGORY_OVERRIDES = {
	// Only controls whether Apple may use content for AI training (Applebot itself crawls).
	'Applebot-Extended': 'ai-training',
};

export function categoryFor(fn, name = '') {
	if (CATEGORY_OVERRIDES[name]) return CATEGORY_OVERRIDES[name];
	const text = plain(fn).toLowerCase();
	if (!text || UNCLEAR.test(text) || text.includes('undocumented')) return 'ai-other';
	if (text.includes('search')) return 'ai-search';
	if (/assistant|agent|coding|chat|browsing|on behalf|user[- ]initiated/.test(text)) return 'ai-assistants';
	if (/train|scrap|data|llm|dataset|model|sold|collect/.test(text)) return 'ai-training';
	return 'ai-other';
}

export function respectsFor(value) {
	const text = plain(value).toLowerCase();
	if (text.startsWith('yes')) return 'yes';
	if (text.startsWith('no')) return 'no';
	return 'unknown';
}

const curatedNames = new Set(
	[...readFileSync(join(root, 'src/data/curated-bots.ts'), 'utf8').matchAll(/bot\('([^']+)'/g)].map((m) =>
		m[1].toLowerCase(),
	),
);

const [robots, commits, license] = await Promise.all([
	getJson(`${RAW}/robots.json`),
	getJson(`https://api.github.com/repos/${REPO}/commits?path=robots.json&per_page=1`),
	getText(`${RAW}/LICENSE`),
]);
const commit = Array.isArray(commits) && commits[0] ? commits[0] : null;

const bots = [];
for (const [name, info] of Object.entries(robots)) {
	if (!BOT_NAME.test(name)) {
		console.warn(`skipped (not a safe robots.txt token): ${JSON.stringify(name)}`);
		continue;
	}
	if (curatedNames.has(name.toLowerCase())) {
		console.warn(`skipped (in the curated list): ${name}`);
		continue;
	}
	bots.push({
		name,
		category: categoryFor(info?.function, name),
		operator: operatorFor(info?.operator),
		respects: respectsFor(info?.respect),
		description: plain(info?.description).slice(0, 300),
		source: 'ai.robots.txt',
	});
}
// robots.txt matches user agents case-insensitively, and upstream sometimes lists one crawler
// under two spellings (meta-externalagent / Meta-ExternalAgent): keep the more informative entry.
const score = (b) =>
	(b.operator !== 'Unknown' ? 2 : 0) + (b.respects !== 'unknown' ? 1 : 0) + (b.description ? 0.5 : 0);
const byName = new Map();
for (const b of bots) {
	const key = b.name.toLowerCase();
	const seen = byName.get(key);
	if (!seen || score(b) > score(seen)) byName.set(key, b);
	if (seen) console.warn(`merged duplicate spelling: ${seen.name} / ${b.name}`);
}
bots.length = 0;
bots.push(...byName.values());
bots.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

const header = `// Generated by scripts/update-bots.mjs from ai.robots.txt (https://github.com/${REPO}),
// MIT License (licenses/ai.robots.txt-LICENSE). Don't edit by hand: run \`pnpm update-bots\`.
// Categories are mapped from each entry's "function" text (categoryFor in the script).
import type { Bot } from '../bots.js';

export const AI_BOTS_SOURCE = ${JSON.stringify(
	{
		repository: `https://github.com/${REPO}`,
		commit: commit?.sha ?? null,
		date: commit?.commit?.committer?.date ?? null,
	},
	null,
	'\t',
)};

export const AI_BOTS: readonly Bot[] = ${JSON.stringify(bots, null, '\t')};
`;
writeFileSync(join(root, 'src/data/ai-bots.ts'), header);
writeFileSync(join(root, 'licenses/ai.robots.txt-LICENSE'), license);
const counts = {};
for (const b of bots) counts[b.category] = (counts[b.category] ?? 0) + 1;
console.log(`ai-bots.ts: ${bots.length} bots from ${commit?.sha?.slice(0, 12) ?? 'unknown commit'}`, counts);
