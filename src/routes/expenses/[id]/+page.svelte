<script lang="ts">
	import EntryForm from '$lib/EntryForm.svelte';

	let { data, form } = $props();
</script>

<h1>{data.entry.status === 'draft' ? 'Completa la bozza' : 'Modifica la spesa'}</h1>
<p class="hint">Inserita da {data.entry.author}.</p>

{#if data.entry.status === 'draft'}
	<p class="notice">
		Questa voce è ancora una bozza: non è contata nei totali. Compila importo, categoria e data, poi
		premi «Salva».
	</p>
{/if}

{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.saved}<p role="status">Modifiche salvate.</p>{/if}

<form method="post" action="?/save">
	<EntryForm
		categories={data.categories}
		entry={data.entry}
		defaultDate={data.today}
		showDraftButton={data.entry.status === 'draft'}
	/>
</form>

<h2>Elimina</h2>
<form method="post" action="?/remove">
	<button type="submit">Elimina questa voce</button>
</form>

<style>
	.notice {
		border-left: 4px solid currentColor;
		padding: 0.5rem 0.75rem;
	}
</style>
