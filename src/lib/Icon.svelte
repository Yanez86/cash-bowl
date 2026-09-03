<script lang="ts">
	// I disegni stanno in icons.ts perché servono anche al server, che deve
	// sapere quali nomi di icona può accettare. Vedi CLAUDE.md §9.
	import { ICONS, type IconName } from './icons';

	// L'icona è decorativa: il nome dell'azione lo dà sempre il testo accanto,
	// visibile o nascosto per lo screen reader. Vedi CLAUDE.md §9.
	let { name, size = 20 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each ICONS[name] as d (d)}<path {d} />{/each}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
