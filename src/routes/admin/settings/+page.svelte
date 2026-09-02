<script lang="ts">
	import { resolve } from '$app/paths';
	import { translator } from '$lib/i18n';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));

	const size = $derived((bytes: number) => {
		const mb = bytes / (1024 * 1024);
		return mb >= 1
			? `${mb.toLocaleString(data.locale, { maximumFractionDigits: 1 })} MB`
			: `${Math.max(1, Math.round(bytes / 1024))} kB`;
	});
	const when = $derived((iso: string) =>
		new Date(iso).toLocaleString(data.locale, { dateStyle: 'medium', timeStyle: 'short' })
	);
</script>

<h1>{t('settings.title')}</h1>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.backedUp}
	<p class="notice" role="status">{t('settings.backupDone', { file: form.backedUp })}</p>
{/if}
{#if form?.rotated !== undefined}
	<p class="notice" role="status">{t('settings.rotated', { count: form.rotated })}</p>
{/if}
{#if form?.imported !== undefined}
	<p class="notice" role="status">{t('settings.imported', { count: form.imported })}</p>
{/if}

<h2>{t('settings.stateTitle')}</h2>
<div class="scroller">
	<table>
		<tbody>
			<tr><th scope="row">{t('settings.version')}</th><td>{data.version}</td></tr>
			<tr><th scope="row">{t('settings.users')}</th><td>{data.counts.users}</td></tr>
			<tr><th scope="row">{t('settings.entries')}</th><td>{data.counts.entries}</td></tr>
			<tr><th scope="row">{t('nav.drafts')}</th><td>{data.counts.drafts}</td></tr>
			<tr>
				<th scope="row">{t('settings.receipts')}</th>
				<td>{data.counts.receipts} — {size(data.receiptBytes)}</td>
			</tr>
			<tr><th scope="row">{t('settings.database')}</th><td>{size(data.databaseBytes)}</td></tr>
			<tr>
				<th scope="row">{t('settings.lastBackup')}</th>
				<td>{data.backups.length > 0 ? when(data.backups[0].at) : t('settings.never')}</td>
			</tr>
		</tbody>
	</table>
</div>

<h2>{t('settings.backupTitle')}</h2>
<p>{t('settings.backupIntro', { keep: data.keep, path: data.paths.backups })}</p>
<p>{t('settings.receiptsNote', { path: data.paths.receipts })}</p>

<div class="row">
	<form method="post" action="?/backup">
		<button type="submit">{t('settings.backupNow')}</button>
	</form>
	<form method="post" action="?/rotate">
		<button type="submit" class="quiet">{t('settings.rotateNow')}</button>
	</form>
</div>

{#if data.backups.length > 0}
	<div class="scroller">
		<table>
			<caption class="hint">{t('settings.backupList')}</caption>
			<thead>
				<tr>
					<th scope="col">{t('settings.file')}</th>
					<th scope="col">{t('settings.when')}</th>
					<th scope="col">{t('settings.size')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.backups as backup (backup.file)}
					<tr>
						<td>{backup.file}</td>
						<td>{when(backup.at)}</td>
						<td>{size(backup.bytes)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<h2>{t('settings.downloadTitle')}</h2>
<ul>
	<li>
		<a href={resolve('/admin/settings/database')} download>{t('settings.downloadDatabase')}</a>
		<span class="hint">{t('settings.downloadDatabaseHint')}</span>
	</li>
	<li>
		<a href={resolve('/admin/settings/export')} download>{t('settings.downloadJson')}</a>
		<span class="hint">{t('settings.downloadJsonHint')}</span>
	</li>
</ul>

<h2>{t('settings.restoreTitle')}</h2>
<p class="notice">{t('settings.restoreWarning')}</p>
<form method="post" action="?/restore" enctype="multipart/form-data">
	<label for="backup">{t('settings.restoreFile')}</label>
	<input id="backup" name="backup" type="file" accept="application/json,.json" required />
	<p><button type="submit">{t('settings.restoreSubmit')}</button></p>
</form>

<h2>{t('settings.migrationsTitle')}</h2>
<div class="scroller">
	<table>
		<tbody>
			{#each data.migrations as migration (migration.name)}
				<tr><th scope="row">{migration.name}</th><td>{when(migration.applied_at)}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	ul {
		padding-left: 1.2rem;
	}
	li {
		margin-bottom: 0.5rem;
	}
</style>
