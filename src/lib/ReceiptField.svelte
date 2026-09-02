<script lang="ts">
	// Il campo delle foto. Con JavaScript il telefono le rimpicciolisce prima di
	// mandarle: partono in fretta anche con poca rete e il disco del server non
	// si riempie. Senza JavaScript il campo resta un normale campo file e
	// funziona lo stesso, solo più lentamente.
	import { translator, type Locale } from './i18n';

	let {
		locale,
		existing = [],
		max = 5
	}: {
		locale: Locale;
		existing?: { id: number; position: number }[];
		max?: number;
	} = $props();

	const t = $derived(translator(locale));
	const room = $derived(Math.max(0, max - existing.length));

	const MAX_SIDE = 1600;
	const QUALITY = 0.8;

	let input: HTMLInputElement | undefined = $state();
	let shrunk: string[] = $state([]);
	let working = $state(false);
	let problem = $state('');

	async function shrink(file: File): Promise<string> {
		// "from-image" rispetta il verso in cui è stata scattata.
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		return canvas.toDataURL('image/jpeg', QUALITY);
	}

	async function chosen(event: Event) {
		const chosenFiles = [...((event.currentTarget as HTMLInputElement).files ?? [])];
		if (chosenFiles.length === 0) return;

		working = true;
		problem = '';
		try {
			shrunk = await Promise.all(chosenFiles.slice(0, room).map(shrink));
			// I file grandi non partono più: viaggiano solo le copie rimpicciolite.
			if (input) input.value = '';
		} catch {
			// Se il ridimensionamento non riesce, si mandano i file com'erano.
			shrunk = [];
			problem = t('receipt.resizeFailed');
		} finally {
			working = false;
		}
	}
</script>

<fieldset>
	<legend>{t('receipt.legend')}</legend>

	{#if existing.length > 0}
		<ul class="gallery">
			{#each existing as photo (photo.id)}
				<li>
					<a href={`/receipts/${photo.id}`}>
						<img
							src={`/receipts/${photo.id}`}
							alt={t('receipt.existingAlt', { n: photo.position })}
						/>
					</a>
					<label for={`drop-${photo.id}`} class="hint">
						<input id={`drop-${photo.id}`} name="receipt_remove" type="checkbox" value={photo.id} />
						{t('receipt.remove')}
					</label>
				</li>
			{/each}
		</ul>
	{/if}

	{#if room > 0}
		<label for="receipt">
			{existing.length > 0 ? t('receipt.addMore') : t('receipt.add')}
			<span class="hint">{t('receipt.hint', { room })}</span>
		</label>
		<input
			id="receipt"
			name="receipt"
			type="file"
			accept="image/jpeg,image/png"
			multiple
			bind:this={input}
			onchange={chosen}
		/>
	{:else}
		<p class="hint">{t('receipt.full', { max })}</p>
	{/if}

	{#each shrunk as photo, index (index)}
		<input type="hidden" name="receipt_data" value={photo} />
	{/each}

	{#if working}<p role="status">{t('receipt.working')}</p>{/if}
	{#if problem}<p class="error" role="alert">{problem}</p>{/if}

	{#if shrunk.length > 0}
		<ul class="gallery">
			{#each shrunk as photo, index (index)}
				<li><img src={photo} alt={t('receipt.newAlt', { n: index + 1 })} /></li>
			{/each}
		</ul>
	{/if}
</fieldset>

<style>
	.gallery {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		list-style: none;
		padding-left: 0;
	}
	.gallery img {
		display: block;
		max-width: 9rem;
		max-height: 9rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	input[type='file'] {
		border: 1px dashed var(--border);
	}
</style>
