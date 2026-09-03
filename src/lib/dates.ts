/** La data di oggi come YYYY-MM-DD, secondo l'orologio di chi guarda. */
export function today(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-03" scritto per una persona: "marzo 2026", oppure "mar 2026" in breve. */
export function monthLabel(ym: string, locale = 'it', short = false): string {
	const [year, month] = ym.split('-').map(Number);
	const name = new Intl.DateTimeFormat(locale, {
		month: short ? 'short' : 'long',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(year, month - 1, 1)));
	return `${name} ${year}`;
}

/** "2026-03-02" scritto per una persona: "2 mar 2026". */
export function dayLabel(iso: string, locale = 'it'): string {
	const [year, month, day] = iso.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
		new Date(Date.UTC(year, month - 1, day))
	);
}

/** Le tre parti di una data, per mostrarla impilata: 2 / set / 2026. */
export function dayParts(iso: string, locale = 'it'): { day: string; month: string; year: string } {
	const [year, month, day] = iso.split('-').map(Number);
	const parts = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).formatToParts(new Date(Date.UTC(year, month - 1, day)));
	const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
	return { day: value('day'), month: value('month'), year: value('year') };
}

/** Il mese prima o il mese dopo. */
export function shiftMonth(ym: string, by: number): string {
	const [year, month] = ym.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1 + by, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
