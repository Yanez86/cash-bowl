<script lang="ts">
	let { form } = $props();
</script>

<h1>Benvenuto in cash-bowl</h1>
<p>
	Questo è il primo avvio: crea il tuo accesso. Diventerai l'amministratore e potrai creare tu gli
	account degli altri membri della famiglia.
</p>

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<form method="post">
	<label for="display_name">Il tuo nome</label>
	<input id="display_name" name="display_name" value={form?.displayName ?? ''} required />

	<label for="username">Nome utente <span class="hint">(minuscolo, senza spazi)</span></label>
	<input
		id="username"
		name="username"
		value={form?.username ?? ''}
		autocomplete="username"
		required
	/>

	<label for="password">Password <span class="hint">(almeno 12 caratteri)</span></label>
	<input
		id="password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<label for="password_repeat">Ripeti la password</label>
	<input
		id="password_repeat"
		name="password_repeat"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<p><button type="submit">Crea il mio accesso</button></p>
</form>
