// Prende le foto da un modulo, in una delle due forme possibili, e le salva.
//
// Con JavaScript attivo il telefono rimpicciolisce ogni foto e la manda come
// testo (data URL): parte poco, e i metadati sono già spariti nel ridisegno.
// Senza JavaScript arrivano i file originali e fa tutto il server. In entrambi
// i casi i controlli sono gli stessi: vedi CLAUDE.md §8.1
import { MAX_BYTES, saveReceipt } from './receipts.ts';

/** Un data URL più lungo di così non vale nemmeno la pena di decodificarlo. */
const MAX_DATA_URL = Math.ceil(MAX_BYTES * 1.4);

export type Upload = { ok: true; files: string[] } | { ok: false; key: string };

/** Legge tutte le foto inviate, fino a `room` posti liberi. */
export async function readReceipts(form: FormData, room: number): Promise<Upload> {
	const incoming: Uint8Array[] = [];

	for (const value of form.getAll('receipt_data')) {
		if (typeof value !== 'string' || !value.startsWith('data:image/')) continue;
		if (value.length > MAX_DATA_URL) return { ok: false, key: 'errors.receiptTooBig' };
		incoming.push(Buffer.from(value.slice(value.indexOf(',') + 1), 'base64'));
	}

	for (const value of form.getAll('receipt')) {
		if (!(value instanceof File) || value.size === 0) continue;
		if (value.size > MAX_BYTES) return { ok: false, key: 'errors.receiptTooBig' };
		incoming.push(new Uint8Array(await value.arrayBuffer()));
	}

	if (incoming.length === 0) return { ok: true, files: [] };
	if (incoming.length > room) return { ok: false, key: 'errors.receiptTooMany' };

	const files: string[] = [];
	for (const bytes of incoming) {
		const result = saveReceipt(bytes);
		if (!result.ok) return { ok: false, key: result.key };
		files.push(result.file);
	}
	return { ok: true, files };
}
