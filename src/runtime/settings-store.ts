/// <reference types="studiocms/v/types" />
/**
 * Loads and saves the admin settings (settings.ts) in StudioCMS's plugin data table
 * (`StudioCMSPluginData`, row `@nascencestudio/tapestry-seo-settings`). Read fresh on every
 * robots.txt and sitemap request (one indexed lookup), so a change applies at once, across server
 * processes too. Straight through the SDK's database client: StudioCMS 0.6.1's `usePluginData()`
 * can't save. Server only.
 */
import { runSDK, SDKCoreJs } from 'studiocms:sdk';
import { DEFAULT_SETTINGS, parseSettings, type SeoSettings } from '../settings.js';

const ROW_ID = '@nascencestudio/tapestry-seo-settings';

/** The settings; the defaults if there are none yet or the database can't be read. */
export async function loadSeoSettings(): Promise<SeoSettings> {
	try {
		const row = await SDKCoreJs.dbService.db
			.selectFrom('StudioCMSPluginData')
			.select('data')
			.where('id', '=', ROW_ID)
			.executeTakeFirst();
		return row ? parseSettings(JSON.parse(row.data)) : DEFAULT_SETTINGS;
	} catch (error) {
		console.warn('[tapestry-seo] could not load settings; using the defaults', error);
		return DEFAULT_SETTINGS;
	}
}

export async function saveSeoSettings(settings: SeoSettings): Promise<void> {
	const data = JSON.stringify(settings);
	await SDKCoreJs.dbService.db.transaction().execute(async (trx) => {
		const existing = await trx
			.selectFrom('StudioCMSPluginData')
			.select('id')
			.where('id', '=', ROW_ID)
			.executeTakeFirst();
		if (existing) await trx.updateTable('StudioCMSPluginData').set({ data }).where('id', '=', ROW_ID).execute();
		else await trx.insertInto('StudioCMSPluginData').values({ id: ROW_ID, data }).execute();
	});
	await runSDK(SDKCoreJs.PLUGINS.clearPluginDataCache()).catch(() => {});
}
