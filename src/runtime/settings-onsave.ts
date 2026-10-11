/**
 * Required by StudioCMS's `settingsPage` (it lists the plugin under the
 * dashboard's Plugins section). The settings page has its own form and
 * endpoint (settings-endpoint.ts), so StudioCMS's generic save isn't used.
 */
export const onSave = () => async () =>
	new Response('Tapestry SEO settings are saved from its own settings page.', {
		status: 405,
		headers: { 'Content-Type': 'text/plain' },
	});
