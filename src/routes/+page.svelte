<script lang="ts">
	// ponytail: schermata iniziale provvisoria. Diventa il cruscotto kakebo
	// nella fase 3, con spese, bozze e bilancio del mese.
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<h1>Ciao {data.user?.display_name}</h1>
<p>L'accesso funziona. Le spese e il bilancio kakebo arrivano nella prossima fase.</p>

{#if data.user?.is_admin}
	<p>
		Sei l'amministratore: puoi <a href={resolve('/admin/users')}>creare gli account</a> della famiglia.
	</p>
{/if}
