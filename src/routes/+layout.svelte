<script lang="ts">
	// ponytail: testi non ancora tradotti, arrivano nella fase 4 insieme ai temi.
	import { resolve } from '$app/paths';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a href="#contenuto" class="skip">Vai al contenuto</a>

{#if data.user}
	<nav aria-label="Principale">
		<a href={resolve('/')}>cash-bowl</a>
		<a href={resolve('/month')}>Il mese</a>
		<a href={resolve('/expenses')}>Spese</a>
		<a href={resolve('/drafts')}>Da sistemare</a>
		<a href={resolve('/categories')}>Categorie</a>
		<a href={resolve('/profile')}>Profilo</a>
		{#if data.user.is_admin}
			<a href={resolve('/admin/users')}>Utenti</a>
		{/if}
		<form method="post" action="/logout">
			<button type="submit">Esci</button>
		</form>
	</nav>
{/if}

<main id="contenuto">
	{@render children()}
</main>

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
	nav form {
		margin-left: auto;
	}
</style>
