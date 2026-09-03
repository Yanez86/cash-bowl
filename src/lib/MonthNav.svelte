<script lang="ts">
	import Icon from './Icon.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import { monthLabel, shiftMonth } from './dates';

	let { ym, path, locale }: { ym: string; path: string; locale: Locale } = $props();
	const t = $derived(translator(locale));
	const previous = $derived(shiftMonth(ym, -1));
	const next = $derived(shiftMonth(ym, 1));
</script>

<nav class="months" aria-label={t('months.chooser')}>
	<!-- Il nome del mese basta a dire dove si va; "mese precedente" resta per
	     chi ascolta la pagina invece di guardarla. -->
	<a class="with-icon" href={`${path}?ym=${previous}`} rel="prev">
		<Icon name="previous" />
		<span class="visually-hidden">{t('months.previous')}</span>
		{monthLabel(previous, locale, true)}
	</a>
	<strong>{monthLabel(ym, locale)}</strong>
	<a class="with-icon" href={`${path}?ym=${next}`} rel="next">
		<span class="visually-hidden">{t('months.next')}</span>
		{monthLabel(next, locale, true)}
		<Icon name="next" />
	</a>
</nav>

<style>
	.months {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		/* Una riga sola: i mesi ai lati sono già abbreviati per starci. */
		flex-wrap: nowrap;
	}
	/* I mesi ai lati stanno indietro: quello in mezzo è dove sei. */
	.months a {
		display: flex;
		align-items: center;
		min-height: var(--tap);
		font-size: 0.95em;
		white-space: nowrap;
	}
	.months strong {
		white-space: nowrap;
	}
</style>
