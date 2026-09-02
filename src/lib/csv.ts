// Scrittura di file CSV.
//
// Attenzione al dettaglio che sembra una sciocchezza: una cella che comincia
// con "=" viene eseguita come formula da Excel e da LibreOffice. Un nome di
// negozio scritto male, o messo lì apposta, diventerebbe un comando sul
// computer di chi apre il file. Vedi audit.md §1.4
const DANGEROUS = /^[=+\-@\t\r]/;

function cell(value: string): string {
	const safe = DANGEROUS.test(value) ? `'${value}` : value;
	return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Righe di testo in un file CSV, con l'a capo che si aspetta Excel. */
export function toCsv(rows: string[][]): string {
	return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

/** Il segno che dice a Excel "questo file è in UTF-8": senza, gli accenti saltano. */
export const BOM = '﻿';
