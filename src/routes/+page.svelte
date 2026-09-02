<script lang="ts">
	// ponytail: pagina provvisoria di verifica, testi non tradotti.
	// Viene sostituita dalla vera schermata iniziale nelle fasi 2-4.
	let { data } = $props();
</script>

<main>
	<h1>cash-bowl</h1>
	<p>Il server risponde e il database è pronto.</p>
	<dl>
		<dt>Migrazioni applicate</dt>
		<dd>{data.migrations}</dd>
		<dt>Utenti registrati</dt>
		<dd>{data.users}</dd>
	</dl>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
	}
	dl {
		display: grid;
		grid-template-columns: auto auto;
		gap: 0.25rem 1rem;
		justify-content: start;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
	}
</style>
