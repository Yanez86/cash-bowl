<script lang="ts">
	// Il campo della foto. Con JavaScript il telefono la rimpicciolisce prima di
	// mandarla: parte in fretta anche con poca rete e il disco del server non si
	// riempie. Senza JavaScript il campo resta un normale campo file e funziona
	// lo stesso, solo più lentamente.
	import { translator, type Locale } from './i18n';

	let {
		locale,
		existing = null,
		entryId = null
	}: { locale: Locale; existing?: string | null; entryId?: number | null } = $props();

	const t = $derived(translator(locale));

	const MAX_SIDE = 1600;
	const QUALITY = 0.8;

	let input: HTMLInputElement | undefined = $state();
	let resized = $state('');
	let preview = $state('');
	let working = $state(false);
	let problem = $state('');

	async function shrink(file: File) {
		working = true;
		problem = '';
		try {
			// "from-image" rispetta l'orientamento con cui è stata scattata.
			const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
			const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			bitmap.close();

			resized = canvas.toDataURL('image/jpeg', QUALITY);
			preview = resized;
			// Il file grande non parte più: viaggia solo la copia rimpicciolita.
			if (input) input.value = '';
		} catch {
			// Se il ridimensionamento non riesce, si manda il file com'è.
			resized = '';
			problem = t('receipt.resizeFailed');
		} finally {
			working = false;
		}
	}

	function chosen(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (file) shrink(file);
	}
</script>

<fieldset>
	<legend>{t('receipt.legend')}</legend>

	{#if existing && entryId}
		<p>
			<a href={`/receipts/${entryId}`}>
				<img class="preview" src={`/receipts/${entryId}`} alt={t('receipt.existingAlt')} />
				<span class="visually-hidden">{t('receipt.openFull')}</span>
			</a>
		</p>
		<p>
			<label for="receipt_remove" class="hint">
				<input id="receipt_remove" name="receipt_remove" type="checkbox" />
				{t('receipt.remove')}
			</label>
		</p>
	{/if}

	<label for="receipt">
		{existing ? t('receipt.replace') : t('receipt.add')}
		<span class="hint">{t('receipt.hint')}</span>
	</label>
	<input
		id="receipt"
		name="receipt"
		type="file"
		accept="image/jpeg,image/png"
		bind:this={input}
		onchange={chosen}
	/>

	<input type="hidden" name="receipt_data" value={resized} />

	{#if working}<p role="status">{t('receipt.working')}</p>{/if}
	{#if problem}<p class="error" role="alert">{problem}</p>{/if}
	{#if preview}
		<p><img class="preview" src={preview} alt={t('receipt.newAlt')} /></p>
	{/if}
</fieldset>

<style>
	.preview {
		max-width: 100%;
		max-height: 14rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	input[type='file'] {
		border: 1px dashed var(--border);
	}
</style>
