<script lang="ts">
	import { translator, type Locale } from '$lib/i18n';
	import { monthLabel, shiftMonth } from './dates';

	let { ym, path, locale }: { ym: string; path: string; locale: Locale } = $props();
	const t = $derived(translator(locale));
</script>

<nav class="months" aria-label={t('months.chooser')}>
	<a href={`${path}?ym=${shiftMonth(ym, -1)}`} rel="prev">{t('months.previous')}</a>
	<strong>{monthLabel(ym, locale)}</strong>
	<a href={`${path}?ym=${shiftMonth(ym, 1)}`} rel="next">{t('months.next')}</a>
</nav>

<style>
	.months {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
</style>
