<script lang="ts">
	// Il nome della categoria dentro un tag colorato. Lo stile sta in app.css,
	// perché i temi (alto contrasto, stampa) devono poterlo raggiungere.
	import { categoryLabel } from './CategoryLabel';
	import Icon from './Icon.svelte';
	import { isCategoryIcon } from './icons';
	import type { Translate } from './i18n';

	// L'icona arriva dal database: se non è più fra quelle previste non si disegna
	// niente, il nome basta da solo. L'informazione non sta mai nella sola icona.
	let {
		t,
		rootKey,
		child = null,
		icon = null
	}: { t: Translate; rootKey: string; child?: string | null; icon?: string | null } = $props();
</script>

<span class="tag" data-cat={rootKey}>
	{#if isCategoryIcon(icon)}<Icon name={icon} size={14} />{/if}
	{categoryLabel(t, rootKey, child)}
</span>
