<script lang="ts">
	let { form } = $props();
</script>

<h1>Accedi a cash-bowl</h1>

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<form method="post">
	<label for="username">Nome utente</label>
	<input
		id="username"
		name="username"
		value={form?.username ?? ''}
		autocomplete="username"
		required
	/>

	<label for="password">Password</label>
	<input id="password" name="password" type="password" autocomplete="current-password" required />

	<p><button type="submit">Entra</button></p>
</form>
