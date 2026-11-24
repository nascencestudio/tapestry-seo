// Maps ai.robots.txt's free-text fields to ours (used by update-bots.mjs; pure, so the tests can
// import it). Types: bot-fields.d.mts.

/** `[Text](https://…)` → `Text`; whitespace collapsed. */
export const plain = (value) =>
	String(value ?? '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();

const UNCLEAR = /^unclear|^unknown|^n\/a$/i;

/**
 * Operators for entries whose upstream "operator" is unclear, but whose own description names the
 * company ("Codex is an AI coding agent by OpenAI…"). Only used when upstream is unclear, so an
 * upstream answer always wins. Add a name only when its description says who runs it.
 */
const OPERATOR_OVERRIDES = {
	AddSearch: ['AddSearchBot'],
	Amazon: ['amazon-QBusiness', 'NovaAct'],
	Anthropic: ['Claude-Agent', 'Claude-Code'],
	Apify: ['ApifyBot', 'ApifyWebsiteContentCrawler'],
	Bixel: ['BixelBot'],
	'Bright Data': ['Brightbot'],
	ByteDance: ['Trae'],
	Ceramic: ['Terra Cotta'],
	DuckDuckGo: ['DuckAssistBot'],
	Exa: ['ExaBot', 'ExaUser'],
	GitHub: ['Code'],
	Google: [
		'CloudVertexBot',
		'Gemini-Deep-Research',
		'Google-Agent',
		'Google-Gemini-CLI',
		'Google-GeminiNotebook',
		'Google-NotebookLM',
	],
	Haiku: ['Haiku-SearchBot'],
	Hark: ['HarkBot'],
	'Kangaroo LLM': ['Kangaroo Bot'],
	Liner: ['Liner-User', 'LinerBot'],
	Meta: ['Meta-ExternalAgent', 'Meta-ExternalFetcher', 'Muse'],
	MiniMax: ['MiniMaxAgent'],
	OpenAI: ['Codex', 'Dot', 'Operator'],
	'Parallel Web Systems': ['Shap-User'],
	Tavily: ['TavilyBot'],
	'Use AI': ['UseAI'],
	Valyu: ['HenkBot'],
	'Webz.io': ['Webzio-Extended'],
	xAI: ['Grok Bot'],
};

/** Lower-cased crawler name → operator (robots.txt names are case-insensitive). */
const operatorByName = new Map(
	Object.entries(OPERATOR_OVERRIDES).flatMap(([operator, names]) =>
		names.map((name) => [name.toLowerCase(), operator]),
	),
);

/**
 * Upstream's "operator" is sometimes a sentence ("Google that retrieves web content…", "Ai2, a
 * non-profit…") or a URL. Keep the name: a URL becomes its site's name, a sentence is cut at the
 * first clause. When it's unclear, OPERATOR_OVERRIDES may name it.
 */
export function operatorFor(value, name = '') {
	const text = plain(value);
	if (!text || UNCLEAR.test(text)) return operatorByName.get(name.toLowerCase()) ?? 'Unknown';
	if (/^https?:\/\//i.test(text)) {
		try {
			const labels = new URL(text).hostname.replace(/^www\./, '').split('.');
			const site = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
			return site ? site[0].toUpperCase() + site.slice(1) : 'Unknown';
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
