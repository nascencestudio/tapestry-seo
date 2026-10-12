/**
 * `@nascencestudio/tapestry-seo/editor`: opens the per-page SEO dialog (ADR 0002). Tapestry's editor
 * loads this on demand when tapestry-seo is installed (Tapestry ADR 0040) and calls `openSeoEditor()`
 * from its SEO button, passing the media picker loader when the media library is installed.
 */
import { render } from 'preact';
import { SeoDialog, type SeoPickerModule } from './SeoDialog.js';
import { ensureStyles } from './styles.js';

export type { SeoMediaItem, SeoPickerModule } from './SeoDialog.js';

export interface SeoEditorOptions {
	/** The StudioCMS page id. */
	pageId: string;
	/** Loads the media library's picker (Tapestry's `virtual:tapestry/media-client`); null without it. */
	loadPicker?: (() => Promise<SeoPickerModule>) | null;
	/** The settings endpoint. Default `/_seo/page`. */
	endpoint?: string;
}

/** Open the dialog; resolves when it closes. */
export function openSeoEditor(options: SeoEditorOptions): Promise<void> {
	ensureStyles();
	return new Promise((resolve) => {
		const host = document.createElement('div');
		host.dataset.seoEditorHost = '';
		document.body.append(host);
		const close = () => {
			render(null, host);
			host.remove();
			resolve();
		};
		render(
			<SeoDialog
				pageId={options.pageId}
				endpoint={options.endpoint ?? '/_seo/page'}
				loadPicker={options.loadPicker ?? null}
				onClose={close}
			/>,
			host,
		);
	});
}
