// Tapestry's build-time modules this plugin uses (Tapestry is required, and both plugins run in the same
// Vite build; Tapestry ADR 0040). Only the parts used here are declared.

/** What the SEO features need from a media library item. */
interface SeoMediaItem {
	id: string;
	kind: string;
	name: string;
	alt: string;
	mime: string;
	url: string;
	width: number | null;
	height: number | null;
	thumbnailUrl: string | null;
}

interface SeoPickerModule {
	openMediaPicker(options: { accept?: readonly string[]; title?: string }): Promise<SeoMediaItem | null>;
	fetchMediaItem(id: string): Promise<SeoMediaItem | null>;
}

declare module 'virtual:tapestry/config' {
	const config: { pageUrlPattern: string; languages: Array<{ code: string; label: string }> };
	export default config;
}

declare module 'virtual:tapestry/media' {
	/** True when @nascencestudio/medialibrary is installed and in use. */
	export const enabled: boolean;
	export function getMediaItems(ids: readonly unknown[]): Promise<Map<string, SeoMediaItem>>;
}

declare module 'virtual:tapestry/media-client' {
	export const enabled: boolean;
	export const loadPicker: null | (() => Promise<SeoPickerModule>);
}
