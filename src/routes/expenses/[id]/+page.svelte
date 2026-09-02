<script lang="ts">
	import EntryForm from '$lib/EntryForm.svelte';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const isDraft = $derived(data.entry.status === 'draft');
</script>

<h1>{isDraft ? t('entryEdit.titleDraft') : t('entryEdit.titleEdit')}</h1>
<p class="hint">{t('entryEdit.author', { name: data.entry.author })}</p>

{#if isDraft}
	<p class="notice">{t('entryEdit.draftNotice')}</p>
{/if}

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.saved}<p class="notice" role="status">{t('entryEdit.saved')}</p>{/if}

<form method="post" action="?/save" enctype="multipart/form-data">
	<EntryForm
		locale={data.locale}
		categories={data.categories}
		entry={data.entry}
		defaultDate={data.today}
		showDraftButton={isDraft}
		receipts={data.receipts}
		maxReceipts={data.maxReceipts}
	/>
</form>

<h2>{t('entryEdit.deleteTitle')}</h2>
<form method="post" action="?/remove">
	<button type="submit" class="quiet">{t('entryEdit.deleteSubmit')}</button>
</form>
