<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { categoryLabel } from '$lib/CategoryLabel';
	import CategoryTag from '$lib/CategoryTag.svelte';
	import Icon from '$lib/Icon.svelte';
	import { CATEGORY_ICONS, isCategoryIcon } from '$lib/icons';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('categories.title')}</h1>
<p>{t('categories.intro')}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.added}
	<p class="notice" role="status">{t('categories.added', { name: form.added })}</p>
{/if}
{#if form?.saved}<p class="notice" role="status">{t('categories.saved')}</p>{/if}
{#if form?.toggled}<p class="notice" role="status">{t('categories.toggled')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('categories.removed')}</p>{/if}
{#if form?.moved}<p class="notice" role="status">{t('categories.moved')}</p>{/if}

{#each data.tree as root (root.id)}
	{@const rootName = categoryLabel(t, root.kakebo_key ?? '', null)}
	<section>
		<h2><CategoryTag {t} rootKey={root.kakebo_key ?? ''} /></h2>

		{#if root.children.length === 0}
			<p class="hint">{t('categories.empty')}</p>
		{:else}
			<ul>
				{#each root.children as child (child.id)}
					<li class:inactive={!child.is_active}>
						<!-- Nome e icona sono un modulo solo: si salvano insieme con il tasto ✓. -->
						<form method="post" action="?/save" class="edit">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />

							<!-- La griglia delle icone sta in un <details>: si apre senza JavaScript e
							     i pallini restano dentro il modulo anche da chiusa. -->
							<details class="picker">
								<summary>
									<Icon name={isCategoryIcon(child.icon) ? child.icon : 'tag'} />
									<span class="visually-hidden">
										{t('categories.chooseIcon', { name: child.name })}
									</span>
								</summary>
								<fieldset>
									<legend class="visually-hidden">
										{t('categories.chooseIcon', { name: child.name })}
									</legend>
									<label>
										<input type="radio" name="icon" value="" checked={!child.icon} />
										<Icon name="tag" />
										<span class="visually-hidden">{t('categories.noIcon')}</span>
									</label>
									{#each CATEGORY_ICONS as name (name)}
										<label>
											<input type="radio" name="icon" value={name} checked={child.icon === name} />
											<Icon {name} />
											<span class="visually-hidden">{t(`icons.${name}`)}</span>
										</label>
									{/each}
								</fieldset>
							</details>

							<label class="visually-hidden" for={`name-${child.id}`}>
								{t('categories.nameOf', { name: child.name })}
							</label>
							<input
								id={`name-${child.id}`}
								name="name"
								value={child.name}
								maxlength="60"
								required
							/>
							<button type="submit" class="icon-button">
								<Icon name="check" />
								<span class="visually-hidden">{t('common.save')} {child.name}</span>
							</button>
						</form>

						<form method="post" action="?/move">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />
							<input type="hidden" name="direction" value="up" />
							<button type="submit" class="icon-button">
								<Icon name="up" />
								<span class="visually-hidden">{t('common.moveUp')} {child.name}</span>
							</button>
						</form>
						<form method="post" action="?/move">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />
							<input type="hidden" name="direction" value="down" />
							<button type="submit" class="icon-button">
								<Icon name="down" />
								<span class="visually-hidden">{t('common.moveDown')} {child.name}</span>
							</button>
						</form>
						<form method="post" action="?/toggle">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />
							<input type="hidden" name="active" value={child.is_active ? '0' : '1'} />
							<button type="submit" class="icon-button">
								<Icon name={child.is_active ? 'eye' : 'eyeOff'} />
								<span class="visually-hidden">
									{child.is_active ? t('categories.deactivate') : t('categories.reactivate')}
									{child.name}
								</span>
							</button>
						</form>
						<form method="post" action="?/remove">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />
							<button type="submit" class="icon-button danger">
								<Icon name="trash" />
								<span class="visually-hidden">{t('common.delete')} {child.name}</span>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="post" action="?/add" class="row">
			<Csrf token={data.csrf} />
			<input type="hidden" name="parent_id" value={root.id} />
			<label for={`add-${root.id}`}>{t('categories.addTo', { name: rootName })}</label>
			<input id={`add-${root.id}`} name="name" maxlength="60" required />
			<button type="submit">{t('common.add')}</button>
		</form>
	</section>
{/each}

<style>
	section {
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
		margin-top: 1.5rem;
	}
	ul {
		list-style: none;
		padding-left: 0;
	}
	/* Tutta la sotto-categoria su una riga: icona, nome e le cinque azioni.
	   Su schermi molto stretti va a capo, perché i tasti non scendono sotto i
	   44×44 px richiesti da CLAUDE.md §9. */
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		border-bottom: 1px solid var(--border);
		padding: 0.25rem 0;
	}
	.edit {
		display: flex;
		flex: 1 1 6rem;
		min-width: 0;
		align-items: center;
		gap: 0.25rem;
	}
	/* min-width: 0, altrimenti il campo non si stringe e allarga tutta la pagina. */
	.edit input[name='name'] {
		flex: 1 1 6rem;
		min-width: 0;
		width: auto;
		margin: 0;
	}
	.inactive {
		opacity: 0.65;
	}

	/* Scelta dell'icona: il riassunto è l'icona di adesso, la griglia si apre
	   sopra la riga senza spostarla. */
	.picker {
		position: relative;
	}
	.picker summary {
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--accent);
		cursor: pointer;
		list-style: none;
	}
	.picker summary::-webkit-details-marker {
		display: none;
	}
	.picker fieldset {
		position: absolute;
		z-index: 2;
		top: calc(var(--tap) + 0.25rem);
		left: 0;
		display: grid;
		/* Sette colonne quando ci stanno, meno su schermi piccolissimi. */
		grid-template-columns: repeat(auto-fill, var(--tap));
		width: min(calc(7 * var(--tap) + 0.5rem), calc(100vw - 2rem));
		margin: 0;
		padding: 0.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
	}
	.picker label {
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border: 1px solid transparent;
		border-radius: var(--radius);
		cursor: pointer;
	}
	.picker input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
	.picker label:has(:checked) {
		border-color: var(--accent);
		color: var(--accent);
	}
	.picker label:has(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
</style>
