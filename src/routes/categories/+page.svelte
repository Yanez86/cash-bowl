<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Categorie</h1>
<p>
	Le quattro categorie del kakebo non si cambiano: sono il metodo. Sotto ognuna puoi creare le
	sotto-categorie che ti servono. Una sotto-categoria già usata non si elimina, si disattiva: così
	lo storico resta leggibile.
</p>

{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.added}<p role="status">Sotto-categoria «{form.added}» creata.</p>{/if}
{#if form?.renamed}<p role="status">Nome aggiornato.</p>{/if}
{#if form?.toggled}<p role="status">Sotto-categoria aggiornata.</p>{/if}
{#if form?.removed}<p role="status">Sotto-categoria eliminata.</p>{/if}
{#if form?.moved}<p role="status">Ordine aggiornato.</p>{/if}

{#each data.tree as root (root.id)}
	<section>
		<h2>{root.name}</h2>

		{#if root.children.length === 0}
			<p class="hint">Nessuna sotto-categoria.</p>
		{:else}
			<ul>
				{#each root.children as child (child.id)}
					<li class:inactive={!child.is_active}>
						<form method="post" action="?/rename" class="row">
							<input type="hidden" name="id" value={child.id} />
							<label class="visually-hidden" for={`name-${child.id}`}>
								Nome della sotto-categoria {child.name}
							</label>
							<input
								id={`name-${child.id}`}
								name="name"
								value={child.name}
								maxlength="60"
								required
							/>
							<button type="submit">Rinomina</button>
						</form>

						<div class="row">
							<form method="post" action="?/move">
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="direction" value="up" />
								<button type="submit"
									>↑ <span class="visually-hidden">Sposta su {child.name}</span></button
								>
							</form>
							<form method="post" action="?/move">
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="direction" value="down" />
								<button type="submit"
									>↓ <span class="visually-hidden">Sposta giù {child.name}</span></button
								>
							</form>
							<form method="post" action="?/toggle">
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="active" value={child.is_active ? '0' : '1'} />
								<button type="submit">
									{child.is_active ? 'Disattiva' : 'Riattiva'}
									<span class="visually-hidden">{child.name}</span>
								</button>
							</form>
							<form method="post" action="?/remove">
								<input type="hidden" name="id" value={child.id} />
								<button type="submit">
									Elimina <span class="visually-hidden">{child.name}</span>
								</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="post" action="?/add" class="row">
			<input type="hidden" name="parent_id" value={root.id} />
			<label for={`add-${root.id}`}>Aggiungi una sotto-categoria a {root.name}</label>
			<input id={`add-${root.id}`} name="name" maxlength="60" required />
			<button type="submit">Aggiungi</button>
		</form>
	</section>
{/each}

<style>
	section {
		border-top: 1px solid;
		padding-top: 0.5rem;
		margin-top: 1.5rem;
	}
	ul {
		list-style: none;
		padding-left: 0;
	}
	li {
		border-bottom: 1px solid;
		padding: 0.5rem 0;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: end;
	}
	.row input[name='name'] {
		flex: 1 1 12rem;
		width: auto;
	}
	.inactive {
		opacity: 0.6;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
