/// <reference types="studiocms/v/types" />
/// <reference path="../virtual.d.ts" />
/**
 * `/_seo/page`: one page's SEO settings for the editor's SEO dialog (ADR 0002). Editors only.
 * - GET `?id=<page id>`: the page (title, description, path), its settings, the site defaults and
 *   the resolved preview images, for the dialog and its previews.
 * - POST `{ id, seo }` (JSON, same origin, 16 KB at most): saves the settings at once (they aren't
 *   part of the page's draft); invalid images or canonicals come back as `problems`, nothing saved.
 */

import { runSDK, SDKCoreJs } from 'studiocms:sdk';
import config from 'virtual:tapestry/config';
import { pagePath } from '@nascencestudio/tapestry';
import type { APIRoute } from 'astro';
import { EMPTY_PAGE_SEO, type PageSeo, pageSeoProblems, parsePageSeo } from '../page-seo.js';
import { resolveImage } from './images.js';
import { loadPageSeo, PAGE_ID, savePageSeo } from './page-seo-store.js';
import { loadSeoSettings } from './settings-store.js';
import { siteOrigin } from './site.js';
import { getSeoViewer } from './viewer.js';

export const prerender = false;

const MAX_BODY = 16 * 1024;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff',
		},
	});

interface PageRecord {
	id: string;
	title?: string | null;
	description?: string | null;
	slug: string;
}

async function findPage(id: string): Promise<PageRecord | null> {
	if (!PAGE_ID.test(id)) return null;
	try {
		return ((await runSDK(SDKCoreJs.GET.page.byId(id))) as unknown as PageRecord | undefined) ?? null;
	} catch {
		return null;
	}
}

/** What the dialog shows: the page, its settings, the site defaults, preview images. */
async function dialogData(page: PageRecord, seo: PageSeo, origin: string) {
	const settings = await loadSeoSettings();
	const [pageImage, defaultImage] = await Promise.all([
		resolveImage([seo.image], origin),
		resolveImage([settings.defaults.image], origin),
	]);
	return {
		page: {
			id: String(page.id),
			title: String(page.title ?? ''),
			description: String(page.description ?? ''),
			path: pagePath(config.pageUrlPattern, String(page.slug)),
		},
		seo,
		defaults: settings.defaults,
		origin,
		images: { page: pageImage, default: defaultImage },
	};
}

export const GET: APIRoute = async (context) => {
	if (!(await getSeoViewer(context)).isEditor) return json({ error: 'Editors only' }, 403);
	const page = await findPage(context.url.searchParams.get('id') ?? '');
	if (!page) return json({ error: 'No such page' }, 404);
	const seo = (await loadPageSeo(String(page.id))) ?? EMPTY_PAGE_SEO;
	return json(await dialogData(page, seo, siteOrigin(context)));
};

export const POST: APIRoute = async (context) => {
	if (context.request.headers.get('origin') !== context.url.origin) {
		return json({ error: 'Cross-origin request refused' }, 403);
	}
	if (!(await getSeoViewer(context)).isEditor) return json({ error: 'Editors only' }, 403);
	const text = await context.request.text();
	if (text.length > MAX_BODY) return json({ error: 'Too large' }, 413);
	let body: { id?: unknown; seo?: unknown };
	try {
		body = JSON.parse(text);
	} catch {
		return json({ error: 'Not JSON' }, 400);
	}
	const page = await findPage(typeof body?.id === 'string' ? body.id : '');
	if (!page) return json({ error: 'No such page' }, 404);
	const problems = pageSeoProblems(body.seo);
	if (Object.keys(problems).length > 0) return json({ error: 'Some values are not valid', problems }, 400);
	const seo = parsePageSeo(body.seo);
	try {
		await savePageSeo(String(page.id), seo);
	} catch (error) {
		console.error('[tapestry-seo] saving page settings failed', error);
		return json({ error: 'Saving failed' }, 500);
	}
	return json(await dialogData(page, seo, siteOrigin(context)));
};
