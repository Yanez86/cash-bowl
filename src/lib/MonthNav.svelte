<script lang="ts">
	import { monthLabel, shiftMonth } from './dates';

	let { ym, path }: { ym: string; path: string } = $props();
</script>

<nav class="months" aria-label="Scelta del mese">
	<a href={`${path}?ym=${shiftMonth(ym, -1)}`} rel="prev">← Mese precedente</a>
	<strong>{monthLabel(ym)}</strong>
	<a href={`${path}?ym=${shiftMonth(ym, 1)}`} rel="next">Mese successivo →</a>
</nav>

<style>
	.months {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		border: 0;
		padding: 0;
	}
</style>
