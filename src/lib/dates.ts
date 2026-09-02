/** La data di oggi come YYYY-MM-DD, secondo l'orologio di chi guarda. */
export function today(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-03" scritto per una persona: "marzo 2026". */
export function monthLabel(ym: string, locale = 'it'): string {
	const [year, month] = ym.split('-').map(Number);
	const name = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
		new Date(Date.UTC(year, month - 1, 1))
	);
	return `${name} ${year}`;
}

/** Il mese prima o il mese dopo. */
export function shiftMonth(ym: string, by: number): string {
	const [year, month] = ym.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1 + by, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
