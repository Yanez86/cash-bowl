<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { categoryLabel } from '$lib/CategoryLabel';
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
{#if form?.renamed}<p class="notice" role="status">{t('categories.renamed')}</p>{/if}
{#if form?.toggled}<p class="notice" role="status">{t('categories.toggled')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('categories.removed')}</p>{/if}
{#if form?.moved}<p class="notice" role="status">{t('categories.moved')}</p>{/if}

{#each data.tree as root (root.id)}
	{@const rootName = categoryLabel(t, root.kakebo_key ?? '', null)}
	<section>
		<h2>{rootName}</h2>

		{#if root.children.length === 0}
			<p class="hint">{t('categories.empty')}</p>
		{:else}
			<ul>
				{#each root.children as child (child.id)}
					<li class:inactive={!child.is_active}>
						<form method="post" action="?/rename" class="row">
							<Csrf token={data.csrf} />
							<input type="hidden" name="id" value={child.id} />
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
							<button type="submit" class="quiet">{t('common.rename')}</button>
						</form>

						<div class="row">
							<form method="post" action="?/move">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="direction" value="up" />
								<button type="submit" class="quiet">
									<span aria-hidden="true">↑</span>
									<span class="visually-hidden">{t('common.moveUp')} {child.name}</span>
								</button>
							</form>
							<form method="post" action="?/move">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="direction" value="down" />
								<button type="submit" class="quiet">
									<span aria-hidden="true">↓</span>
									<span class="visually-hidden">{t('common.moveDown')} {child.name}</span>
								</button>
							</form>
							<form method="post" action="?/toggle">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={child.id} />
								<input type="hidden" name="active" value={child.is_active ? '0' : '1'} />
								<button type="submit" class="quiet">
									{child.is_active ? t('categories.deactivate') : t('categories.reactivate')}
									<span class="visually-hidden">{child.name}</span>
								</button>
							</form>
							<form method="post" action="?/remove">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={child.id} />
								<button type="submit" class="quiet">
									{t('common.delete')} <span class="visually-hidden">{child.name}</span>
								</button>
							</form>
						</div>
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
	li {
		border-bottom: 1px solid var(--border);
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
		opacity: 0.65;
	}
</style>
