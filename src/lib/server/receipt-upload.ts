// Prende la foto da un modulo, in una delle due forme possibili, e la salva.
//
// Con JavaScript attivo il telefono rimpicciolisce la foto e la manda come
// testo (data URL): parte poco, e i metadati sono già spariti nel ridisegno.
// Senza JavaScript arriva il file originale e fa tutto il server. In entrambi
// i casi i controlli sono gli stessi: vedi CLAUDE.md §8.1
import { MAX_BYTES, saveReceipt, type SaveResult } from './receipts';

/** Un data URL più lungo di così non vale nemmeno la pena di decodificarlo. */
const MAX_DATA_URL = Math.ceil(MAX_BYTES * 1.4);

export type Upload =
	{ ok: true; file: string | null; removed: boolean } | { ok: false; key: string };

export async function readReceipt(form: FormData): Promise<Upload> {
	if (form.get('receipt_remove') === 'on') return { ok: true, file: null, removed: true };

	const data = form.get('receipt_data');
	if (typeof data === 'string' && data.startsWith('data:image/')) {
		if (data.length > MAX_DATA_URL) return { ok: false, key: 'errors.receiptTooBig' };
		const base64 = data.slice(data.indexOf(',') + 1);
		return done(saveReceipt(Buffer.from(base64, 'base64')));
	}

	const file = form.get('receipt');
	if (file instanceof File && file.size > 0) {
		if (file.size > MAX_BYTES) return { ok: false, key: 'errors.receiptTooBig' };
		return done(saveReceipt(new Uint8Array(await file.arrayBuffer())));
	}

	// Nessuna foto inviata: quella già presente resta dov'è.
	return { ok: true, file: null, removed: false };
}

const done = (result: SaveResult): Upload =>
	result.ok ? { ok: true, file: result.file, removed: false } : { ok: false, key: result.key };
