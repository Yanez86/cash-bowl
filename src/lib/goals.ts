// I conti di un salvadanaio. Sono funzioni pure: si provano senza database.

/** Quanto manca al traguardo. Mai negativo: superato è superato. */
export const missing = (target: number, saved: number) => Math.max(0, target - saved);

/** A che punto sei, da 0 a 100. */
export function progress(target: number, saved: number): number {
	if (target <= 0) return 100;
	return Math.min(100, Math.round((saved / target) * 100));
}

/**
 * Quanti mesi restano da qui alla data, contando anche quello in corso.
 * Se la data è passata, zero.
 */
export function monthsLeft(today: string, dueOn: string): number {
	const [y1, m1] = today.split('-').map(Number);
	const [y2, m2] = dueOn.split('-').map(Number);
	return Math.max(0, (y2 - y1) * 12 + (m2 - m1) + 1);
}

/**
 * Quanto mettere via ogni mese per arrivare in tempo.
 * null se non c'è una data, o se il traguardo è già raggiunto.
 * Se il tempo è scaduto restituisce tutto quello che manca: è la verità.
 */
export function monthlyNeeded(
	target: number,
	saved: number,
	dueOn: string | null,
	today: string
): number | null {
	const left = missing(target, saved);
	if (left === 0 || !dueOn) return null;
	const months = monthsLeft(today, dueOn);
	return months === 0 ? left : Math.ceil(left / months);
}
