/**
 * The SEO dialog's styles, added once to the document when it first opens. A string rather than a
 * CSS import: CSS imported from browser code in a plugin can end up on every public page (Tapestry
 * known issue #32). Themed with the StudioCMS dashboard's variables, like Tapestry's modals.
 */
const CSS = `
.seo-dialog {
	--seo-bg: var(--background-step-1, hsl(0 0% 94%));
	--seo-field: var(--background-base, hsl(0 0% 97%));
	--seo-border: var(--border, hsl(263 5% 68%));
	--seo-text: var(--text-normal, hsl(0 0% 5%));
	--seo-muted: var(--text-muted, hsl(0 0% 35%));
	--seo-primary: var(--primary-base, hsl(259 74% 45%));
	--seo-warn: hsl(32 90% 30%);
	--seo-danger: hsl(339 80% 36%);
	--seo-radius: var(--radius-md, 0.5rem);
	width: 46rem;
	max-width: calc(100vw - 2rem);
	max-height: calc(100vh - 2rem);
	padding: 0;
	color: var(--seo-text);
	background: var(--seo-bg);
	border: 1px solid var(--seo-border);
	border-radius: var(--seo-radius);
	box-shadow: 0 16px 48px rgb(0 0 0 / 0.4);
	font-size: 0.875rem;
}
[data-theme="dark"] .seo-dialog {
	--seo-warn: hsl(38 95% 65%);
	--seo-danger: hsl(339 90% 74%);
}
.seo-dialog *, .seo-dialog *::before, .seo-dialog *::after { box-sizing: border-box; }
.seo-dialog::backdrop { background: rgb(0 0 0 / 0.55); }
.seo-dialog__body {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	max-height: calc(100vh - 2rem);
	padding: 1rem 1.25rem;
	overflow: auto;
}
.seo-dialog__header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.seo-dialog__title { margin: 0; font-size: 1rem; font-weight: 600; }
.seo-dialog__columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 18rem); gap: 1.25rem; }
@media (max-width: 44rem) { .seo-dialog__columns { grid-template-columns: minmax(0, 1fr); } }
.seo-fields, .seo-previews { display: flex; flex-direction: column; gap: 0.875rem; min-width: 0; }
.seo-field { display: flex; flex-direction: column; gap: 0.25rem; }
.seo-field__label { font-weight: 600; }
.seo-field__row { display: flex; justify-content: space-between; gap: 0.5rem; align-items: baseline; }
.seo-input {
	width: 100%;
	padding: 0.45rem 0.6rem;
	font: inherit;
	color: var(--seo-text);
	background: var(--seo-field);
	border: 1px solid var(--seo-border);
	border-radius: calc(var(--seo-radius) - 0.125rem);
}
textarea.seo-input { min-height: 5rem; resize: vertical; }
.seo-input:focus-visible, .seo-button:focus-visible, .seo-check input:focus-visible, .seo-advanced summary:focus-visible {
	outline: 2px solid var(--seo-primary);
	outline-offset: 2px;
}
.seo-input[aria-invalid="true"] { border-color: var(--seo-danger); }
.seo-help { margin: 0; color: var(--seo-muted); font-size: 0.8125rem; }
.seo-count { color: var(--seo-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.seo-count[data-over] { color: var(--seo-warn); font-weight: 600; }
.seo-error { margin: 0; color: var(--seo-danger); font-size: 0.8125rem; }
.seo-check { display: flex; gap: 0.5rem; align-items: flex-start; }
.seo-check input { margin: 0.15rem 0 0; width: 1rem; height: 1rem; accent-color: var(--seo-primary); }
.seo-image { display: flex; gap: 0.75rem; align-items: center; }
.seo-image__thumb {
	width: 4.5rem;
	height: 2.5rem;
	flex: none;
	object-fit: cover;
	border-radius: 0.25rem;
	border: 1px solid var(--seo-border);
	background: var(--seo-field);
}
.seo-image__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seo-advanced summary { cursor: pointer; font-weight: 600; width: fit-content; }
.seo-advanced[open] summary { margin-bottom: 0.5rem; }
.seo-button {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.4rem 0.8rem;
	font: inherit;
	color: var(--seo-text);
	background: var(--seo-field);
	border: 1px solid var(--seo-border);
	border-radius: calc(var(--seo-radius) - 0.125rem);
	cursor: pointer;
}
.seo-button:hover:not(:disabled) { border-color: var(--seo-primary); }
.seo-button:disabled { opacity: 0.6; cursor: default; }
.seo-button--primary { color: var(--text-inverted, #fff); background: var(--seo-primary); border-color: var(--seo-primary); }
.seo-button--icon { padding: 0.3rem; }
.seo-actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
.seo-status { margin-right: auto; color: var(--seo-muted); }
.seo-status[data-kind="error"] { color: var(--seo-danger); }
.seo-preview__label { margin: 0 0 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--seo-muted); }
.seo-serp {
	padding: 0.75rem;
	background: #fff;
	color: #202124;
	border: 1px solid var(--seo-border);
	border-radius: var(--seo-radius);
	font-family: Arial, sans-serif;
	overflow-wrap: anywhere;
}
.seo-serp__url { margin: 0; font-size: 0.75rem; color: #4d5156; }
.seo-serp__title { margin: 0.2rem 0; font-size: 1.125rem; line-height: 1.3; color: #1a0dab; }
.seo-serp__desc { margin: 0; font-size: 0.8125rem; line-height: 1.45; color: #4d5156; }
.seo-serp__noindex { margin: 0; color: #4d5156; font-style: italic; }
.seo-card {
	overflow: hidden;
	background: #fff;
	color: #1c1e21;
	border: 1px solid var(--seo-border);
	border-radius: var(--seo-radius);
	overflow-wrap: anywhere;
}
.seo-card__image { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; background: #e4e6eb; }
.seo-card__text { padding: 0.5rem 0.75rem 0.625rem; background: #f0f2f5; }
.seo-card__host { margin: 0; font-size: 0.6875rem; text-transform: uppercase; color: #606770; }
.seo-card__title { margin: 0.125rem 0; font-size: 0.9375rem; font-weight: 600; line-height: 1.25; }
.seo-card__desc { margin: 0; font-size: 0.8125rem; color: #606770; }
.seo-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
`;

let added = false;

export function ensureStyles(): void {
	if (added || document.querySelector('style[data-seo-styles]')) return;
	const style = document.createElement('style');
	style.dataset.seoStyles = '';
	style.textContent = CSS;
	document.head.append(style);
	added = true;
}
