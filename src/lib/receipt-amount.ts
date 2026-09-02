// Trova l'importo dentro il testo letto da uno scontrino.
//
// È la parte che sbaglia più spesso, quindi non decide niente: **propone**.
// Il campo si riempie solo se la persona conferma. Vedi piani.md, fase 11.

/** Un importo ha sempre i centesimi: due cifre dopo la virgola. */
// Le migliaia si separano col punto in italiano e con la virgola in inglese:
// si accettano entrambi, purché i gruppi siano di tre cifre esatte.
const AMOUNT = /(?<![\d,.])(\d{1,3}(?:[.,\s]\d{3})+|\d{1,7})[.,](\d{2})(?![\d])/g;

/**
 * Le parole che indicano il totale, in italiano e in inglese. Si cercano prima
 * queste: "CONTANTI 50,00" sotto a "TOTALE 45,50" è la banconota che hai dato,
 * non quello che hai speso, e non deve mai vincere.
 */
const TOTAL_WORDS = /\b(totale|total|tot|importo|amount|da\s*pagare|to\s*pay)\b/i;

/** Ripiego: la valuta accanto a una cifra è un indizio più debole. */
const CURRENCY_WORDS = /(\beur\b|\beuro\b|€)/i;

/** Oltre questa cifra non è più uno scontrino: 100.000 euro. */
const TOO_MUCH = 10_000_000;

/** Gli importi trovati in una riga, in centesimi. */
function amountsIn(line: string): number[] {
	const found: number[] = [];
	for (const match of line.matchAll(AMOUNT)) {
		const whole = Number(match[1].replace(/[.,\s]/g, ''));
		const cents = whole * 100 + Number(match[2]);
		if (Number.isSafeInteger(cents) && cents > 0 && cents <= TOO_MUCH) found.push(cents);
	}
	return found;
}

/**
 * L'importo più probabile, in centesimi, oppure null se non se ne trovano.
 *
 * Prima si cercano le righe che contengono una parola come "TOTALE", partendo
 * dal fondo: su uno scontrino il totale sta in basso. Se non ce ne sono, si
 * prende l'importo più grande della metà finale.
 */
export function findAmount(text: string): number | null {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	// Dal fondo verso l'alto: su uno scontrino il totale sta in basso.
	for (const words of [TOTAL_WORDS, CURRENCY_WORDS]) {
		for (let index = lines.length - 1; index >= 0; index--) {
			if (!words.test(lines[index])) continue;
			const onLine = amountsIn(lines[index]);
			if (onLine.length > 0) return Math.max(...onLine);

			// La parola da sola, con la cifra sulla riga dopo: capita spesso.
			const next = amountsIn(lines[index + 1] ?? '');
			if (next.length > 0) return Math.max(...next);
		}
	}

	const tail = lines.slice(Math.floor(lines.length / 2)).flatMap(amountsIn);
	if (tail.length > 0) return Math.max(...tail);

	const all = lines.flatMap(amountsIn);
	return all.length > 0 ? Math.max(...all) : null;
}
