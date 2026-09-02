<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { translator } from '$lib/i18n';

	// La lingua può mancare se l'errore è successo prima del caricamento dei dati.
	const t = $derived(translator(page.data.locale ?? 'en'));
</script>

<h1>{t('errors.pageTitle')}</h1>
<p class="error" role="alert">{page.error?.message ?? page.status}</p>
<p><a href={resolve('/')}>{t('errors.backHome')}</a></p>
