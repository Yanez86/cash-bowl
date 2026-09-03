<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import EntryForm from '$lib/EntryForm.svelte';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('dashboard.addTitle')}</h1>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}

<form method="post" enctype="multipart/form-data">
	<Csrf token={data.csrf} />
	<EntryForm
		locale={data.locale}
		categories={data.categories}
		defaultDate={data.today}
		ocrAvailable={data.ocrAvailable}
	/>
</form>
