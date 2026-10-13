/**
 * Stored image values (media library id or https URL) → link-preview images, through Tapestry's
 * media module (`virtual:tapestry/media`, backed by @nascencestudio/medialibrary when installed).
 * Server only.
 */
/// <reference path="../virtual.d.ts" />
import { getMediaItems } from 'virtual:tapestry/media';
import { type MetaImage, previewImage } from '../meta.js';
import { MEDIA_ID } from '../page-seo.js';

/** The first value that resolves to an image link previews can show, or null. */
export async function resolveImage(values: ReadonlyArray<string | null>, origin: string): Promise<MetaImage | null> {
	const ids = values.filter((v): v is string => typeof v === 'string' && MEDIA_ID.test(v));
	const items = ids.length ? await getMediaItems(ids).catch(() => new Map()) : new Map();
	for (const value of values) {
		const image = previewImage(value, origin, value ? (items.get(value) ?? null) : null);
		if (image) return image;
	}
	return null;
}
