<script lang="ts">
	import { ACCENTS, ACCENT_LABEL, THEMES, THEME_LABEL } from '$lib/appearance';
	import { translator, LOCALES, LOCALE_NAMES } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const MIN = 12;
</script>

<h1>{t('profile.title')}</h1>
<p>{t('profile.loggedAs', { username: data.user?.username ?? '' })}</p>

<h2>{t('profile.appearanceTitle')}</h2>
{#if form?.appearanceSaved}<p class="notice" role="status">{t('profile.appearanceSaved')}</p>{/if}
<form method="post" action="?/appearance">
	<label for="locale">{t('profile.language')}</label>
	<select id="locale" name="locale">
		{#each LOCALES as code (code)}
			<option value={code} selected={data.user?.locale === code}>{LOCALE_NAMES[code]}</option>
		{/each}
	</select>

	<label for="theme">{t('profile.theme')}</label>
	<select id="theme" name="theme">
		{#each THEMES as value (value)}
			<option {value} selected={data.user?.theme === value}>
				{t(THEME_LABEL[value])}
			</option>
		{/each}
	</select>

	<label for="accent">{t('profile.accent')}</label>
	<select id="accent" name="accent">
		{#each ACCENTS as value (value)}
			<option {value} selected={data.user?.accent === value}>
				{t(ACCENT_LABEL[value])}
			</option>
		{/each}
	</select>

	<p>
		<label for="high_contrast" class="hint">
			<input
				id="high_contrast"
				name="high_contrast"
				type="checkbox"
				checked={!!data.user?.high_contrast}
			/>
			{t('profile.highContrast')} — {t('profile.highContrastHint')}
		</label>
	</p>

	<p>
		<label for="reduced_motion" class="hint">
			<input
				id="reduced_motion"
				name="reduced_motion"
				type="checkbox"
				checked={!!data.user?.reduced_motion}
			/>
			{t('profile.reducedMotion')} — {t('profile.reducedMotionHint')}
		</label>
	</p>

	<p><button type="submit">{t('profile.appearanceSubmit')}</button></p>
</form>

<h2>{t('profile.nameTitle')}</h2>
{#if form?.nameError}<p class="error" role="alert">{t(form.nameError)}</p>{/if}
{#if form?.nameSaved}<p class="notice" role="status">{t('profile.nameSaved')}</p>{/if}
<form method="post" action="?/name">
	<label for="display_name">{t('setup.yourName')}</label>
	<input id="display_name" name="display_name" value={data.user?.display_name ?? ''} required />
	<p><button type="submit">{t('profile.nameSubmit')}</button></p>
</form>

<h2>{t('profile.passwordTitle')}</h2>
{#if form?.passwordError}
	<p class="error" role="alert">{t(form.passwordError, form.passwordVars)}</p>
{/if}
{#if form?.passwordSaved}<p class="notice" role="status">{t('profile.passwordSaved')}</p>{/if}
<form method="post" action="?/password">
	<label for="current_password">{t('profile.currentPassword')}</label>
	<input
		id="current_password"
		name="current_password"
		type="password"
		autocomplete="current-password"
		required
	/>

	<label for="new_password">
		{t('profile.newPassword')} <span class="hint">{t('setup.passwordHint', { min: MIN })}</span>
	</label>
	<input
		id="new_password"
		name="new_password"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<label for="new_password_repeat">{t('profile.repeatPassword')}</label>
	<input
		id="new_password_repeat"
		name="new_password_repeat"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<p><button type="submit">{t('profile.passwordSubmit')}</button></p>
</form>
