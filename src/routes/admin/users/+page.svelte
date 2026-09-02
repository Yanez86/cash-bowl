<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const MIN = 12;
</script>

<h1>{t('admin.title')}</h1>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.created}<p class="notice" role="status">
		{t('admin.created', { name: form.created })}
	</p>{/if}
{#if form?.updated}<p class="notice" role="status">{t('admin.updated')}</p>{/if}
{#if form?.passwordReset}<p class="notice" role="status">{t('admin.passwordReset')}</p>{/if}
{#if form?.deleted}<p class="notice" role="status">{t('admin.deleted')}</p>{/if}

<div class="scroller">
	<table>
		<caption class="hint">{t('admin.caption')}</caption>
		<thead>
			<tr>
				<th scope="col">{t('admin.name')}</th>
				<th scope="col">{t('admin.username')}</th>
				<th scope="col">{t('admin.role')}</th>
				<th scope="col">{t('admin.state')}</th>
				<th scope="col">{t('common.actions')}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as user (user.id)}
				<tr>
					<td>{user.display_name}</td>
					<td>{user.username}</td>
					<td>{user.is_admin ? t('admin.roleAdmin') : t('admin.roleMember')}</td>
					<td>{user.is_active ? t('admin.active') : t('admin.inactive')}</td>
					<td class="row">
						{#if user.id !== data.me?.id}
							<form method="post" action="?/toggleActive">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={user.id} />
								<button type="submit" class="quiet">
									{user.is_active ? t('admin.deactivate') : t('admin.reactivate')}
									<span class="visually-hidden">{user.display_name}</span>
								</button>
							</form>
							<form method="post" action="?/delete">
								<Csrf token={data.csrf} />
								<input type="hidden" name="id" value={user.id} />
								<button type="submit" class="quiet">
									{t('common.delete')} <span class="visually-hidden">{user.display_name}</span>
								</button>
							</form>
						{:else}
							<span class="hint">{t('admin.you')}</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<h2>{t('admin.addTitle')}</h2>
<form method="post" action="?/create">
	<Csrf token={data.csrf} />
	<label for="display_name">{t('admin.name')}</label>
	<input id="display_name" name="display_name" required />

	<label for="username">
		{t('admin.username')} <span class="hint">{t('setup.usernameHint')}</span>
	</label>
	<input id="username" name="username" autocomplete="off" required />

	<label for="password">
		{t('admin.initialPassword')} <span class="hint">{t('setup.passwordHint', { min: MIN })}</span>
	</label>
	<input
		id="password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<p>
		<label for="is_admin" class="hint">
			<input id="is_admin" name="is_admin" type="checkbox" />
			{t('admin.makeAdmin')}
		</label>
	</p>

	<p><button type="submit">{t('admin.createSubmit')}</button></p>
</form>

<h2>{t('admin.resetTitle')}</h2>
<p class="hint">{t('admin.resetHint')}</p>
<form method="post" action="?/resetPassword">
	<Csrf token={data.csrf} />
	<label for="reset_id">{t('admin.resetPerson')}</label>
	<select id="reset_id" name="id" required>
		{#each data.users as user (user.id)}
			<option value={user.id}>{user.display_name} ({user.username})</option>
		{/each}
	</select>

	<label for="reset_password">
		{t('profile.newPassword')} <span class="hint">{t('setup.passwordHint', { min: MIN })}</span>
	</label>
	<input
		id="reset_password"
		name="password"
		type="password"
		autocomplete="new-password"
		minlength={MIN}
		required
	/>

	<p><button type="submit">{t('admin.resetSubmit')}</button></p>
</form>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
