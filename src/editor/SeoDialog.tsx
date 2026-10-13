/**
 * The per-page SEO dialog (ADR 0002), opened from Tapestry's editor bar. Loads the page's settings
 * from `/_seo/page`, edits them with live previews (search result, link card) and saves them at once
 * (not with the page's draft). Images come from the media library when it's installed, else an
 * https:// address. No `name` attributes and `type="button"` everywhere: the dashboard's page form
 * saves named fields and submits on Enter.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MetaImage } from '../meta.js';
import { EMPTY_PAGE_SEO, PAGE_SEO_LIMITS, type PageSeo, RECOMMENDED } from '../page-seo.js';
import type { SiteDefaults } from '../settings.js';
import { breadcrumb, effectiveDescription, effectiveTitle, host, type PreviewPage, truncate } from './preview.js';

export interface SeoPickerModule {
	openMediaPicker(options: { accept?: readonly string[]; title?: string }): Promise<SeoMediaItem | null>;
}

export interface SeoMediaItem {
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

interface DialogData {
	page: PreviewPage & { id: string };
	seo: PageSeo;
	defaults: SiteDefaults;
	origin: string;
	images: { page: MetaImage | null; default: MetaImage | null };
}

type Problems = Partial<Record<keyof PageSeo, string>>;

interface Props {
	pageId: string;
	endpoint: string;
	loadPicker: (() => Promise<SeoPickerModule>) | null;
	onClose: () => void;
}

const PREVIEW_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function SeoDialog({ pageId, endpoint, loadPicker, onClose }: Props) {
	const dialog = useRef<HTMLDialogElement>(null);
	const [data, setData] = useState<DialogData | null>(null);
	const [seo, setSeo] = useState<PageSeo>(EMPTY_PAGE_SEO);
	/** The chosen image's details when picked in this session (the server resolves saved ones). */
	const [picked, setPicked] = useState<MetaImage | null>(null);
	const [pickedName, setPickedName] = useState('');
	const [status, setStatus] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
	const [problems, setProblems] = useState<Problems>({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const element = dialog.current;
		if (element && !element.open) element.showModal();
		return () => element?.close();
	}, []);

	useEffect(() => {
		let cancelled = false;
		fetch(`${endpoint}?id=${encodeURIComponent(pageId)}`, { headers: { Accept: 'application/json' } })
			.then(async (response) => {
				if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? response.statusText);
				return response.json() as Promise<DialogData>;
			})
			.then((loaded) => {
				if (cancelled) return;
				setData(loaded);
				setSeo(loaded.seo);
			})
			.catch(
				(error) => !cancelled && setStatus({ kind: 'error', text: `Couldn't load the SEO settings: ${error.message}` }),
			);
		return () => {
			cancelled = true;
		};
	}, [pageId, endpoint]);

	const dirty = useMemo(() => data !== null && JSON.stringify(seo) !== JSON.stringify(data.seo), [seo, data]);
	const set = <K extends keyof PageSeo>(key: K, value: PageSeo[K]) => {
		setSeo((current) => ({ ...current, [key]: value }));
		setProblems((current) => ({ ...current, [key]: undefined }));
		setStatus(null);
	};

	async function chooseImage() {
		if (!loadPicker) return;
		const item = await (await loadPicker()).openMediaPicker({ accept: ['image'], title: 'Choose a social image' });
		if (!item) return;
		set('image', item.id);
		setPickedName(item.name);
		setPicked(
			PREVIEW_TYPES.has(item.mime) ? { url: item.url, width: item.width, height: item.height, alt: item.alt } : null,
		);
		if (!PREVIEW_TYPES.has(item.mime)) {
			setProblems((current) => ({
				...current,
				image: 'Link previews can’t show this type (use JPEG, PNG, WebP or GIF).',
			}));
		}
	}

	async function save() {
		if (!data || saving) return;
		setSaving(true);
		setStatus({ kind: 'info', text: 'Saving…' });
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ id: pageId, seo }),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) {
				if (body?.problems) setProblems(body.problems);
				throw new Error(body?.error ?? response.statusText);
			}
			setData(body as DialogData);
			setSeo((body as DialogData).seo);
			setPicked(null);
			setStatus({ kind: 'info', text: 'Saved. Search engines see the change the next time they visit.' });
		} catch (error) {
			setStatus({ kind: 'error', text: `Not saved: ${(error as Error).message}` });
		} finally {
			setSaving(false);
		}
	}

	const title = data ? effectiveTitle(seo, data.page, data.defaults) : '';
	const description = data ? effectiveDescription(seo, data.page, data.defaults) : '';
	// The page's own image (picked now, or saved), else the site default.
	const ownImage = seo.image ? (picked ?? (seo.image === data?.seo.image ? data?.images.page : null)) : null;
	const urlImage = seo.image?.startsWith('https:') ? { url: seo.image, width: null, height: null, alt: '' } : null;
	const cardImage = ownImage ?? urlImage ?? (seo.image ? null : (data?.images.default ?? null));
	const imageName = seo.image ? pickedName || (seo.image.startsWith('https:') ? seo.image : 'Chosen image') : '';

	return (
		<dialog
			ref={dialog}
			class="seo-dialog"
			aria-labelledby="seo-dialog-title"
			data-seo-dialog
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			onKeyDown={(event) => {
				// Enter in a one-line field would submit the dashboard's page form (that saves the page).
				if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
			}}
		>
			<div class="seo-dialog__body">
				<div class="seo-dialog__header">
					<h3 id="seo-dialog-title" class="seo-dialog__title">
						SEO{data ? ` for “${data.page.title || 'this page'}”` : ''}
					</h3>
					<button
						type="button"
						class="seo-button seo-button--icon"
						aria-label="Close"
						title="Close (Escape)"
						onClick={onClose}
					>
						<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
							<path
								d="M4 4l8 8M12 4l-8 8"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
							/>
						</svg>
					</button>
				</div>

				{!data ? (
					<p class="seo-help" role="status">
						{status?.text ?? 'Loading…'}
					</p>
				) : (
					<>
						<div class="seo-dialog__columns">
							<div class="seo-fields">
								<TextField
									id="seo-title"
									label="Search title"
									value={seo.title}
									placeholder={effectiveTitle(EMPTY_PAGE_SEO, data.page, data.defaults)}
									help="Shown as the link in search results and link previews. Leave empty to use the page title."
									max={PAGE_SEO_LIMITS.title}
									recommended={RECOMMENDED.title}
									effective={title}
									onInput={(value) => set('title', value)}
								/>
								<TextField
									id="seo-description"
									label="Description"
									multiline
									value={seo.description}
									placeholder={effectiveDescription(EMPTY_PAGE_SEO, data.page, data.defaults)}
									help="One or two sentences shown under the title. Leave empty to use the page’s description or the site default."
									max={PAGE_SEO_LIMITS.description}
									recommended={RECOMMENDED.description}
									effective={description}
									onInput={(value) => set('description', value)}
								/>

								<div class="seo-field">
									<span class="seo-field__label" id="seo-image-label">
										Social image
									</span>
									{loadPicker ? (
										<div class="seo-image">
											{seo.image && ownImage ? <img class="seo-image__thumb" src={ownImage.url} alt="" /> : null}
											<span class="seo-image__name" data-seo-image-name>
												{imageName || (data.images.default ? 'Uses the site default' : 'None')}
											</span>
											<button
												type="button"
												class="seo-button"
												aria-describedby="seo-image-label"
												onClick={chooseImage}
												data-seo-choose-image
											>
												{seo.image ? 'Change…' : 'Choose…'}
											</button>
											{seo.image && (
												<button
													type="button"
													class="seo-button"
													onClick={() => {
														set('image', null);
														setPicked(null);
														setPickedName('');
													}}
													data-seo-remove-image
												>
													Remove
												</button>
											)}
										</div>
									) : (
										<input
											type="url"
											class="seo-input"
											aria-labelledby="seo-image-label"
											aria-describedby="seo-image-help"
											aria-invalid={problems.image ? 'true' : undefined}
											placeholder="https://"
											value={seo.image ?? ''}
											onInput={(event) => set('image', event.currentTarget.value.trim() || null)}
											data-seo-image-url
										/>
									)}
									<p class="seo-help" id="seo-image-help">
										Shown when the page is shared. About 1200 × 630 pixels works everywhere.
									</p>
									{problems.image && <p class="seo-error">{problems.image}</p>}
								</div>

								<label class="seo-check">
									<input
										type="checkbox"
										checked={seo.noindex}
										onChange={(event) => set('noindex', event.currentTarget.checked)}
										aria-describedby="seo-noindex-help"
										data-seo-noindex
									/>
									<span>
										<span class="seo-field__label">Hide from search engines</span>
										<p class="seo-help" id="seo-noindex-help">
											Search engines won’t list this page, and it leaves the sitemap. Visitors can still open it.
										</p>
									</span>
								</label>

								<details class="seo-advanced" open={Boolean(seo.canonical)}>
									<summary>Advanced</summary>
									<div class="seo-field">
										<label class="seo-field__label" for="seo-canonical">
											Canonical address
										</label>
										<input
											id="seo-canonical"
											type="url"
											class="seo-input"
											placeholder={new URL(data.page.path, data.origin).href}
											value={seo.canonical}
											aria-describedby="seo-canonical-help"
											aria-invalid={problems.canonical ? 'true' : undefined}
											onInput={(event) => set('canonical', event.currentTarget.value.trim())}
											data-seo-canonical
										/>
										<p class="seo-help" id="seo-canonical-help">
											Only if this content’s main address is elsewhere (search engines then list that one).
										</p>
										{problems.canonical && <p class="seo-error">{problems.canonical}</p>}
									</div>
								</details>
							</div>

							<div class="seo-previews">
								<section aria-labelledby="seo-serp-label">
									<p class="seo-preview__label" id="seo-serp-label">
										Search result
									</p>
									<div class="seo-serp" data-seo-serp>
										{seo.noindex ? (
											<p class="seo-serp__noindex">Hidden from search engines.</p>
										) : (
											<>
												<p class="seo-serp__url">{breadcrumb(data.origin, data.page.path)}</p>
												<p class="seo-serp__title" data-seo-serp-title>
													{truncate(title, RECOMMENDED.title)}
												</p>
												{description && <p class="seo-serp__desc">{truncate(description, RECOMMENDED.description)}</p>}
											</>
										)}
									</div>
								</section>
								<section aria-labelledby="seo-card-label">
									<p class="seo-preview__label" id="seo-card-label">
										Link preview
									</p>
									<div class="seo-card" data-seo-card>
										{cardImage && <img class="seo-card__image" src={cardImage.url} alt="" data-seo-card-image />}
										<div class="seo-card__text">
											<p class="seo-card__host">{host(data.origin)}</p>
											<p class="seo-card__title">{truncate(title, 90)}</p>
											{description && <p class="seo-card__desc">{truncate(description, 110)}</p>}
										</div>
									</div>
								</section>
							</div>
						</div>

						<div class="seo-actions">
							<p class="seo-status" role="status" data-kind={status?.kind} data-seo-status>
								{status?.text ?? (dirty ? 'Changes apply when you save.' : '')}
							</p>
							<button type="button" class="seo-button" onClick={onClose} data-seo-cancel>
								{dirty ? 'Cancel' : 'Close'}
							</button>
							<button
								type="button"
								class="seo-button seo-button--primary"
								disabled={!dirty || saving}
								onClick={save}
								data-seo-save
							>
								Save
							</button>
						</div>
					</>
				)}
			</div>
		</dialog>
	);
}

function TextField(props: {
	id: string;
	label: string;
	value: string;
	placeholder: string;
	help: string;
	max: number;
	recommended: number;
	/** The text that will be used (own or fallback), for the counter. */
	effective: string;
	multiline?: boolean;
	onInput: (value: string) => void;
}) {
	const length = props.effective.length;
	const over = length > props.recommended;
	const common = {
		id: props.id,
		class: 'seo-input',
		value: props.value,
		placeholder: props.placeholder,
		maxLength: props.max,
		'aria-describedby': `${props.id}-help ${props.id}-count`,
		'data-seo-field': props.id,
	};
	return (
		<div class="seo-field">
			<div class="seo-field__row">
				<label class="seo-field__label" for={props.id}>
					{props.label}
				</label>
				<span class="seo-count" id={`${props.id}-count`} data-over={over ? '' : undefined}>
					{length} / {props.recommended}
					<span class="seo-sr-only">
						{over ? ' characters, longer than search results usually show' : ' characters'}
					</span>
				</span>
			</div>
			{props.multiline ? (
				<textarea {...common} rows={3} onInput={(event) => props.onInput(event.currentTarget.value)} />
			) : (
				<input type="text" {...common} onInput={(event) => props.onInput(event.currentTarget.value)} />
			)}
			<p class="seo-help" id={`${props.id}-help`}>
				{props.help}
			</p>
		</div>
	);
}
