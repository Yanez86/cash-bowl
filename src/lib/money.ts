// Gli importi vivono come numeri interi in centesimi. Qui sono gli unici due
// punti in cui si passa dal formato leggibile a quello salvato. CLAUDE.md §5.

/** Limite di buon senso: 10 milioni. Serve a fermare gli errori di battitura. */
export const MAX_CENTS = 1_000_000_000;

/**
 * Legge un importo scritto da una persona e lo trasforma in centesimi.
 * Accetta "12,34", "12.34", "1.234,56", "1 234,56". Restituisce null se non si capisce.
 */
export function parseAmount(input: string): number | null {
	const cleaned = input.replace(/[\s']/g, '');
	if (!/^\d[\d.,]*$/.test(cleaned)) return null;

	// L'ultimo separatore seguito da una o due cifre è quello dei decimali.
	const decimal = /^(.*)[.,](\d{1,2})$/.exec(cleaned);
	const whole = decimal ? decimal[1] : cleaned;
	const decimals = decimal ? decimal[2] : '';

	if (!/^\d+$/.test(whole)) {
		// Lo stesso simbolo non può separare sia le migliaia sia i decimali:
		// "12,345,67" non vuol dire niente e va rifiutato, non indovinato.
		const decimalSeparator = cleaned[whole.length];
		if (decimals && whole.includes(decimalSeparator)) return null;
		if (!/^\d{1,3}([.,]\d{3})+$/.test(whole)) return null;
		if (whole.includes('.') && whole.includes(',')) return null;
	}

	const cents = Number(whole.replace(/[.,]/g, '')) * 100 + Number(decimals.padEnd(2, '0') || '0');
	return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}

/** Scrive un importo per una persona, nella sua lingua e nella valuta scelta. */
export function formatAmount(cents: number, locale = 'it', currency = 'EUR'): string {
	return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Come formatAmount, ma senza simbolo: serve nei campi di un modulo. */
export function amountForInput(cents: number): string {
	return (cents / 100).toFixed(2);
}
