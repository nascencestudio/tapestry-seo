/// <reference types="studiocms/v/types" />
/**
 * Per-page SEO settings (page-seo.ts), one row per page in StudioCMS's plugin data table
 * (`@nascencestudio/tapestry-seo-page:<page id>`). Re-validated on every read. A page whose settings
 * are all empty has no row. Read fresh by `<Seo>` and the sitemap (indexed lookups), so a save
 * applies at once. Straight through the SDK's database client (`usePluginData()` can't save in
 * StudioCMS 0.6.1). Server only.
 */
import { runSDK, SDKCoreJs } from 'studiocms:sdk';
import { isEmptyPageSeo, type PageSeo, parsePageSeo } from '../page-seo.js';

const PREFIX = '@nascencestudio/tapestry-seo-page:';

/** StudioCMS page ids (UUIDs); anything else is refused before it reaches a query. */
export const PAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const rowId = (pageId: string) => `${PREFIX}${pageId}`;

/** A page's settings, or null when it has none (or the database can't be read). */
export async function loadPageSeo(pageId: string): Promise<PageSeo | null> {
	if (!PAGE_ID.test(pageId)) return null;
	try {
		const row = await SDKCoreJs.dbService.db
			.selectFrom('StudioCMSPluginData')
			.select('data')
			.where('id', '=', rowId(pageId))
			.executeTakeFirst();
		return row ? parsePageSeo(JSON.parse(row.data)) : null;
	} catch (error) {
		console.warn('[tapestry-seo] could not load page settings', error);
		return null;
	}
}

/** Every page's settings by page id (for the sitemap). */
export async function loadAllPageSeo(): Promise<Map<string, PageSeo>> {
	try {
		// A range on the primary key instead of LIKE (no wildcards to escape).
		const rows = await SDKCoreJs.dbService.db
			.selectFrom('StudioCMSPluginData')
			.select(['id', 'data'])
			.where('id', '>=', PREFIX)
			.where('id', '<', `${PREFIX}￿`)
			.execute();
		const map = new Map<string, PageSeo>();
		for (const row of rows) {
			try {
				map.set(row.id.slice(PREFIX.length), parsePageSeo(JSON.parse(row.data)));
			} catch {
				// unreadable row: as if there were none
			}
		}
		return map;
	} catch (error) {
		console.warn('[tapestry-seo] could not load page settings', error);
		return new Map();
	}
}

export async function savePageSeo(pageId: string, seo: PageSeo): Promise<void> {
	if (!PAGE_ID.test(pageId)) throw new Error('invalid page id');
	const id = rowId(pageId);
	const data = JSON.stringify(seo);
	await SDKCoreJs.dbService.db.transaction().execute(async (trx) => {
		if (isEmptyPageSeo(seo)) {
			await trx.deleteFrom('StudioCMSPluginData').where('id', '=', id).execute();
			return;
		}
		const existing = await trx.selectFrom('StudioCMSPluginData').select('id').where('id', '=', id).executeTakeFirst();
		if (existing) await trx.updateTable('StudioCMSPluginData').set({ data }).where('id', '=', id).execute();
		else await trx.insertInto('StudioCMSPluginData').values({ id, data }).execute();
	});
	await runSDK(SDKCoreJs.PLUGINS.clearPluginDataCache()).catch(() => {});
}
