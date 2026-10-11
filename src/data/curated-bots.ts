/**
 * Crawlers that aren't AI crawlers (those come from ai.robots.txt, ./ai-bots.ts): search
 * engines, SEO tools, social link previews and web archives. Maintained by hand: tokens as their
 * operators document them; `respects: 'unknown'` where the operator doesn't say. Adding an entry:
 * keep it short and sourced (the operator's documentation), and run the tests (names must be
 * valid tokens and must not also be in the AI list).
 *
 * ai.robots.txt also lists Applebot and facebookexternalhit (their content may feed AI features);
 * they're kept here, as a search engine and a link-preview fetcher, because blocking them also
 * removes Siri/Spotlight results and Facebook link previews. The update script skips them.
 */
import type { Bot } from '../bots.js';

const bot = (
	name: string,
	category: Bot['category'],
	operator: string,
	respects: Bot['respects'],
	description: string,
): Bot => ({ name, category, operator, respects, description, source: 'curated' });

export const CURATED_BOTS: readonly Bot[] = [
	bot('Googlebot', 'search', 'Google', 'yes', 'Google Search.'),
	bot('Bingbot', 'search', 'Microsoft', 'yes', 'Bing, and search engines using Bing results.'),
	bot('DuckDuckBot', 'search', 'DuckDuckGo', 'yes', 'DuckDuckGo search.'),
	bot('Applebot', 'search', 'Apple', 'yes', 'Siri and Spotlight suggestions, Apple search.'),
	bot('YandexBot', 'search', 'Yandex', 'yes', 'Yandex search.'),
	bot('Baiduspider', 'search', 'Baidu', 'yes', 'Baidu search.'),
	bot('Slurp', 'search', 'Yahoo', 'yes', 'Yahoo search (Japan and others).'),
	bot('SeznamBot', 'search', 'Seznam', 'yes', 'Seznam search (Czech Republic).'),
	bot('Qwantbot', 'search', 'Qwant', 'yes', 'Qwant search.'),
	bot('MojeekBot', 'search', 'Mojeek', 'yes', 'Mojeek, an independent search engine.'),
	bot('Yeti', 'search', 'Naver', 'yes', 'Naver search (South Korea).'),

	bot('AhrefsBot', 'seo', 'Ahrefs', 'yes', 'Backlink and ranking index.'),
	bot('AhrefsSiteAudit', 'seo', 'Ahrefs', 'yes', 'Site audits run by Ahrefs users.'),
	bot('SemrushBot', 'seo', 'Semrush', 'yes', 'Backlink and ranking data.'),
	bot('SiteAuditBot', 'seo', 'Semrush', 'yes', 'Site audits run by Semrush users.'),
	bot('MJ12bot', 'seo', 'Majestic', 'yes', 'Backlink index.'),
	bot('DotBot', 'seo', 'Moz', 'yes', 'Link index.'),
	bot('rogerbot', 'seo', 'Moz', 'yes', 'Site audits run by Moz users.'),
	bot('BLEXBot', 'seo', 'WebMeUp', 'yes', 'Backlink index.'),
	bot('DataForSeoBot', 'seo', 'DataForSEO', 'yes', 'SEO data sold to other tools.'),
	bot('Barkrowler', 'seo', 'Babbar', 'yes', 'Link graph for SEO tools.'),
	bot('serpstatbot', 'seo', 'Serpstat', 'yes', 'Backlink index.'),
	bot('SEOkicks', 'seo', 'SEOkicks', 'yes', 'Backlink index.'),
	bot('Screaming Frog SEO Spider', 'seo', 'Screaming Frog', 'yes', 'Desktop crawler run by SEO consultants.'),

	bot('facebookexternalhit', 'social', 'Meta', 'unknown', 'Link previews on Facebook, Instagram and Messenger.'),
	bot('Twitterbot', 'social', 'X', 'yes', 'Link previews (cards) on X.'),
	bot('LinkedInBot', 'social', 'LinkedIn', 'yes', 'Link previews on LinkedIn.'),
	bot('Slackbot', 'social', 'Slack', 'unknown', 'Link previews in Slack.'),
	bot('Discordbot', 'social', 'Discord', 'unknown', 'Link previews in Discord.'),
	bot('WhatsApp', 'social', 'Meta', 'unknown', 'Link previews in WhatsApp.'),
	bot('TelegramBot', 'social', 'Telegram', 'unknown', 'Link previews in Telegram.'),
	bot('Pinterestbot', 'social', 'Pinterest', 'yes', 'Pins and link previews on Pinterest.'),

	bot('archive.org_bot', 'archive', 'Internet Archive', 'yes', 'The Wayback Machine.'),
	bot('ia_archiver', 'archive', 'Internet Archive', 'yes', 'Older Internet Archive / Alexa crawler.'),
];
