<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import Icon from '$lib/Icon.svelte';
	import type { ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { translator } from '$lib/i18n';
	import '../app.css';

	let { data, children } = $props();
	const t = $derived(translator(data.locale));
	// Sulla pagina che aggiunge una spesa il pulsante rapido non serve: ci sei già.
	const onAddPage = $derived(page.url.pathname === resolve('/expenses/new'));

	type NavLink = { href: string; label: string; icon: ComponentProps<typeof Icon>['name'] };

	const links: NavLink[] = $derived([
		{ href: resolve('/'), label: t('nav.home'), icon: 'wallet' },
		{ href: resolve('/month'), label: t('nav.plan'), icon: 'notebook' },
		{ href: resolve('/expenses'), label: t('nav.expenses'), icon: 'receipt' },
		{ href: resolve('/recurring'), label: t('nav.recurring'), icon: 'repeat' },
		{ href: resolve('/drafts'), label: t('nav.drafts'), icon: 'draft' },
		{ href: resolve('/goals'), label: t('nav.goals'), icon: 'goal' },
		{ href: resolve('/reports'), label: t('nav.reports'), icon: 'chart' },
		{ href: resolve('/categories'), label: t('nav.categories'), icon: 'tag' },
		{ href: resolve('/profile'), label: t('nav.profile'), icon: 'user' },
		...(data.user?.is_admin
			? ([
					{ href: resolve('/admin/users'), label: t('nav.users'), icon: 'users' },
					{ href: resolve('/admin/settings'), label: t('nav.settings'), icon: 'wrench' }
				] as NavLink[])
			: [])
	]);

	let menuOpen = $state(false);
	// Con la navigazione lato client il menu resterebbe aperto: lo richiudiamo a ogni cambio pagina.
	$effect(() => {
		if (page.url.pathname) menuOpen = false;
	});
</script>

<svelte:head>
	<title>{t('app.name')}</title>
</svelte:head>

<a href="#contenuto" class="skip">{t('app.skipToContent')}</a>

{#if data.user}
	<header>
		<div class="bar">
			<!-- <details> nativo: apre e chiude da solo, da tastiera e senza JavaScript.
			     Il menu sta nel <nav> fratello, mostrato dal selettore details[open] ~ nav. -->
			<details class="toggle" bind:open={menuOpen}>
				<summary class="with-icon"><Icon name="menu" /> {t('nav.menu')}</summary>
			</details>
			<span class="brand">
				{t('app.name')}
				<img src="/icon-192.png" alt="" width="28" height="28" />
			</span>
			<nav aria-label={t('nav.label')}>
				{#each links as link (link.href)}
					<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
						<Icon name={link.icon} />
						{link.label}
					</a>
				{/each}
				<form method="post" action="/logout">
					<Csrf token={data.csrf} />
					<button type="submit" class="quiet with-icon">
						<Icon name="logout" />
						{t('nav.logout')}
					</button>
				</form>
			</nav>
		</div>
	</header>
{/if}

<main id="contenuto">
	{@render children()}
</main>

{#if data.user && !onAddPage}
	<a class="quick" href={resolve('/expenses/new')}>
		<Icon name="plus" size={28} />
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
		border-bottom: 1px solid var(--rule);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		max-width: 44rem;
		margin: 0 auto;
		padding: 0.6rem var(--gap);
	}

	.toggle summary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: var(--tap);
		padding: 0.5rem 0.8rem;
		color: var(--accent);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		/* Via il triangolino: il simbolo ☰ dice già tutto. */
		list-style: none;
	}

	.toggle summary::-webkit-details-marker {
		display: none;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
		font-weight: 600;
	}

	.brand img {
		width: 1.75rem;
		height: 1.75rem;
	}

	/* Telefono: le voci stanno in colonna sotto la barra, e solo a menu aperto. */
	nav {
		flex-basis: 100%;
		display: none;
		flex-direction: column;
	}

	.toggle[open] ~ nav {
		display: flex;
	}

	nav a,
	nav button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: var(--tap);
		padding: 0 0.6rem;
		border-radius: var(--radius);
	}

	/* La pagina in cui sei: non più una sottolineatura, ma la voce accesa. */
	nav a[aria-current='page'] {
		font-weight: 700;
		background: var(--bg);
	}

	/* Schermo grande: niente hamburger, le voci tornano in riga. */
	@media (min-width: 48rem) {
		.toggle {
			display: none;
		}

		nav {
			flex-basis: auto;
			display: flex;
			flex-direction: row;
			gap: 0.25rem;
			align-items: center;
			/* Il marchio resta a destra: le voci passano prima di lui, sulla stessa riga. */
			order: -1;
			flex: 1;
			min-width: 0;
			/* Se le voci non ci stanno, la barra scorre invece di andare a capo. */
			overflow-x: auto;
			white-space: nowrap;
		}

		nav form {
			margin-left: auto;
		}
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
		text-decoration: none;
		color: var(--accent-fg);
		background: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 50%;
		box-shadow: 0 2px 8px rgb(0 0 0 / 25%);
	}
</style>
