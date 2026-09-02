<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('login.title')}</h1>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}

<form method="post">
	<Csrf token={data.csrf} />
	<label for="username">{t('login.username')}</label>
	<input
		id="username"
		name="username"
		value={form?.username ?? ''}
		autocomplete="username"
		required
	/>

	<label for="password">{t('login.password')}</label>
	<input id="password" name="password" type="password" autocomplete="current-password" required />

	<p><button type="submit">{t('login.submit')}</button></p>
</form>
