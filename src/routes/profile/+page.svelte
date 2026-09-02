<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Il mio profilo</h1>
<p>Accedi come <strong>{data.user?.username}</strong>.</p>

<h2>Nome mostrato</h2>
{#if form?.nameError}<p class="error" role="alert">{form.nameError}</p>{/if}
{#if form?.nameSaved}<p role="status">Nome aggiornato.</p>{/if}
<form method="post" action="?/name">
	<label for="display_name">Il tuo nome</label>
	<input id="display_name" name="display_name" value={data.user?.display_name ?? ''} required />
	<p><button type="submit">Salva il nome</button></p>
</form>

<h2>Cambia password</h2>
{#if form?.passwordError}<p class="error" role="alert">{form.passwordError}</p>{/if}
{#if form?.passwordSaved}
	<p role="status">Password cambiata. Gli altri dispositivi dovranno accedere di nuovo.</p>
{/if}
<form method="post" action="?/password">
	<label for="current_password">Password attuale</label>
	<input
		id="current_password"
		name="current_password"
		type="password"
		autocomplete="current-password"
		required
	/>

	<label for="new_password">Nuova password <span class="hint">(almeno 12 caratteri)</span></label>
	<input
		id="new_password"
		name="new_password"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<label for="new_password_repeat">Ripeti la nuova password</label>
	<input
		id="new_password_repeat"
		name="new_password_repeat"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<p><button type="submit">Cambia password</button></p>
</form>
