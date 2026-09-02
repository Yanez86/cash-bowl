<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const MIN = 12;
</script>

<h1>{t('setup.title')}</h1>
<p>{t('setup.intro')}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}

<form method="post">
	<Csrf token={data.csrf} />
	<label for="display_name">{t('setup.yourName')}</label>
	<input id="display_name" name="display_name" value={form?.displayName ?? ''} required />

	<label for="username">
		{t('setup.username')} <span class="hint">{t('setup.usernameHint')}</span>
	</label>
	<input
		id="username"
		name="username"
		value={form?.username ?? ''}
		autocomplete="username"
		required
	/>

	<label for="password">
		{t('setup.password')} <span class="hint">{t('setup.passwordHint', { min: MIN })}</span>
	</label>
	<input
		id="password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<label for="password_repeat">{t('setup.repeat')}</label>
	<input
		id="password_repeat"
		name="password_repeat"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<p><button type="submit">{t('setup.submit')}</button></p>
</form>
