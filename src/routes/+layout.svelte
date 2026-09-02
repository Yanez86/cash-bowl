<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { translator } from '$lib/i18n';
	import '../app.css';

	let { data, children } = $props();
	const t = $derived(translator(data.locale));
	const onDashboard = $derived(page.url.pathname === resolve('/'));
</script>

<svelte:head>
	<title>{t('app.name')}</title>
</svelte:head>

<a href="#contenuto" class="skip">{t('app.skipToContent')}</a>

{#if data.user}
	<header>
		<nav aria-label={t('nav.label')}>
			<a href={resolve('/')}>{t('nav.home')}</a>
			<a href={resolve('/month')}>{t('nav.plan')}</a>
			<a href={resolve('/expenses')}>{t('nav.expenses')}</a>
			<a href={resolve('/recurring')}>{t('nav.recurring')}</a>
			<a href={resolve('/drafts')}>{t('nav.drafts')}</a>
			<a href={resolve('/reports')}>{t('nav.reports')}</a>
			<a href={resolve('/categories')}>{t('nav.categories')}</a>
			<a href={resolve('/profile')}>{t('nav.profile')}</a>
			{#if data.user.is_admin}
				<a href={resolve('/admin/users')}>{t('nav.users')}</a>
				<a href={resolve('/admin/settings')}>{t('nav.settings')}</a>
			{/if}
			<form method="post" action="/logout">
				<button type="submit" class="quiet">{t('nav.logout')}</button>
			</form>
		</nav>
	</header>
{/if}

<main id="contenuto">
	{@render children()}
</main>

{#if data.user && !onDashboard}
	<a class="quick" href={`${resolve('/')}#add`}>
		<span aria-hidden="true">+</span>
		<span class="visually-hidden">{t('dashboard.quickAdd')}</span>
	</a>
{/if}

<style>
	.skip {
		position: absolute;
		left: -9999px;
	}
	.skip:focus {
		position: static;
		display: inline-block;
		padding: 0.5rem;
	}

	header {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	nav {
		display: flex;
		gap: 1rem;
		align-items: center;
		max-width: 44rem;
		margin: 0 auto;
		padding: 0.6rem var(--gap);
		/* Sul telefono la barra scorre invece di andare a capo tre volte. */
		overflow-x: auto;
		white-space: nowrap;
	}

	nav form {
		margin-left: auto;
	}

	/* Il pulsante per registrare una spesa al volo: sempre sotto il pollice. */
	.quick {
		position: fixed;
		right: max(var(--gap), env(safe-area-inset-right));
		bottom: max(var(--gap), env(safe-area-inset-bottom));
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		font-size: 2rem;
		line-height: 1;
		text-decoration: none;
		color: var(--accent-fg);
		background: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 50%;
		box-shadow: 0 2px 8px rgb(0 0 0 / 25%);
	}
</style>
