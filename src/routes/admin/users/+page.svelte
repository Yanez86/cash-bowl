<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Utenti della famiglia</h1>

{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.created}<p role="status">Account «{form.created}» creato.</p>{/if}
{#if form?.updated}<p role="status">Utente aggiornato.</p>{/if}
{#if form?.passwordReset}<p role="status">Password reimpostata.</p>{/if}
{#if form?.deleted}<p role="status">Utente eliminato.</p>{/if}

<table>
	<caption class="hint">Chi può entrare in questa installazione</caption>
	<thead>
		<tr>
			<th scope="col">Nome</th>
			<th scope="col">Nome utente</th>
			<th scope="col">Ruolo</th>
			<th scope="col">Stato</th>
			<th scope="col">Azioni</th>
		</tr>
	</thead>
	<tbody>
		{#each data.users as user (user.id)}
			<tr>
				<td>{user.display_name}</td>
				<td>{user.username}</td>
				<td>{user.is_admin ? 'Amministratore' : 'Membro'}</td>
				<td>{user.is_active ? 'Attivo' : 'Disattivato'}</td>
				<td>
					{#if user.id !== data.me?.id}
						<form method="post" action="?/toggleActive">
							<input type="hidden" name="id" value={user.id} />
							<button type="submit">
								{user.is_active ? 'Disattiva' : 'Riattiva'}
								<span class="hint">{user.display_name}</span>
							</button>
						</form>
						<form method="post" action="?/delete">
							<input type="hidden" name="id" value={user.id} />
							<button type="submit">
								Elimina <span class="hint">{user.display_name}</span>
							</button>
						</form>
					{:else}
						<span class="hint">sei tu</span>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>Aggiungi una persona</h2>
<form method="post" action="?/create">
	<label for="display_name">Nome</label>
	<input id="display_name" name="display_name" required />

	<label for="username">Nome utente <span class="hint">(minuscolo, senza spazi)</span></label>
	<input id="username" name="username" autocomplete="off" required />

	<label for="password">Password iniziale <span class="hint">(almeno 12 caratteri)</span></label>
	<input
		id="password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<p>
		<label for="is_admin" class="hint">
			<input id="is_admin" name="is_admin" type="checkbox" />
			Rendi questa persona amministratore
		</label>
	</p>

	<p><button type="submit">Crea l'account</button></p>
</form>

<h2>Reimposta la password di qualcuno</h2>
<p class="hint">Da usare quando un familiare ha dimenticato la password.</p>
<form method="post" action="?/resetPassword">
	<label for="reset_id">Persona</label>
	<select id="reset_id" name="id" required>
		{#each data.users as user (user.id)}
			<option value={user.id}>{user.display_name} ({user.username})</option>
		{/each}
	</select>

	<label for="reset_password">Nuova password <span class="hint">(almeno 12 caratteri)</span></label>
	<input
		id="reset_password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength="12"
		required
	/>

	<p><button type="submit">Reimposta la password</button></p>
</form>
