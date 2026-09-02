// Le foto degli scontrini. Tutto quello che arriva da fuori è sospetto:
// si controlla il tipo dai byte, si ripuliscono i metadati, si genera un nome
// nuovo e si salva fuori dalla cartella pubblica. Vedi CLAUDE.md §8.1
import { randomUUID } from 'node:crypto';
import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './db.ts';

/** Limite sul singolo file, controllato sul server e non solo nel browser. */
export const MAX_BYTES = 4 * 1024 * 1024;

export type ImageKind = 'jpeg' | 'png';

const EXTENSION: Record<ImageKind, string> = { jpeg: 'jpg', png: 'png' };
export const MIME: Record<ImageKind, string> = { jpeg: 'image/jpeg', png: 'image/png' };

/** Il nome di un file salvato da noi, e nient'altro: niente percorsi da fuori. */
const SAFE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

export const receiptsDir = () => join(DATA_DIR, 'receipts');

/**
 * Il tipo si riconosce dai primi byte del file, mai dal nome e mai da quello
 * che dichiara il browser. Ammessi solo JPEG e PNG: niente SVG, che è codice.
 */
export function detectImage(bytes: Uint8Array): ImageKind | null {
	if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'jpeg';
	}
	const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (bytes.length > 8 && png.every((value, index) => bytes[index] === value)) return 'png';
	return null;
}

/**
 * Toglie i dati nascosti: posizione GPS, modello del telefono, orario, commenti.
 * Una foto di scontrino dice dove sei stato, e non deve dirlo a nessuno.
 */
export function stripMetadata(bytes: Uint8Array, kind: ImageKind): Uint8Array {
	return kind === 'jpeg' ? stripJpeg(bytes) : stripPng(bytes);
}

/** Nei JPEG i metadati stanno nei segmenti APPn e nei commenti: si saltano. */
function stripJpeg(bytes: Uint8Array): Uint8Array {
	const keep: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
	let at = 2;

	while (at + 4 <= bytes.length) {
		if (bytes[at] !== 0xff) break;
		const marker = bytes[at + 1];

		// Inizio dei dati veri: da qui in poi si copia tutto senza guardare.
		if (marker === 0xda) {
			keep.push(bytes.subarray(at));
			at = bytes.length;
			break;
		}

		const length = (bytes[at + 2] << 8) | bytes[at + 3];
		if (length < 2 || at + 2 + length > bytes.length) break;

		const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
		if (!isMetadata) keep.push(bytes.subarray(at, at + 2 + length));
		at += 2 + length;
	}

	if (at < bytes.length) keep.push(bytes.subarray(at));
	return Buffer.concat(keep);
}

/** Nei PNG si tengono solo i pezzi che servono a disegnare l'immagine. */
function stripPng(bytes: Uint8Array): Uint8Array {
	const wanted = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'sRGB']);
	const keep: Uint8Array[] = [bytes.subarray(0, 8)];
	const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let at = 8;

	while (at + 12 <= view.length) {
		const length = view.readUInt32BE(at);
		const type = view.toString('latin1', at + 4, at + 8);
		const end = at + 12 + length;
		if (end > view.length) break;
		if (wanted.has(type)) keep.push(bytes.subarray(at, end));
		at = end;
		if (type === 'IEND') break;
	}

	return Buffer.concat(keep);
}

export type SaveResult = { ok: true; file: string } | { ok: false; key: string };

/** Controlla, ripulisce e salva. Restituisce il nome del file, generato a caso. */
export function saveReceipt(bytes: Uint8Array): SaveResult {
	if (bytes.length === 0) return { ok: false, key: 'errors.receiptEmpty' };
	if (bytes.length > MAX_BYTES) return { ok: false, key: 'errors.receiptTooBig' };

	const kind = detectImage(bytes);
	if (!kind) return { ok: false, key: 'errors.receiptNotAnImage' };

	const cleaned = stripMetadata(bytes, kind);
	const file = `${randomUUID()}.${EXTENSION[kind]}`;
	mkdirSync(receiptsDir(), { recursive: true });
	writeFileSync(join(receiptsDir(), file), cleaned, { mode: 0o600 });
	return { ok: true, file };
}

/** Il percorso di un file nostro, oppure null: nessun pezzo di percorso da fuori. */
export function receiptPath(file: string): string | null {
	return SAFE_NAME.test(file) ? join(receiptsDir(), file) : null;
}

export function receiptKind(file: string): ImageKind {
	return file.endsWith('.png') ? 'png' : 'jpeg';
}

/** Cancella il file. Un file orfano è un dato personale dimenticato sul disco. */
export function deleteReceipt(file: string | null): void {
	const path = file && receiptPath(file);
	if (!path) return;
	try {
		unlinkSync(path);
	} catch {
		// Già sparito: va bene così.
	}
}

/** Quanto spazio occupano le foto, per la pagina di stato della fase 7. */
export function receiptBytes(files: string[]): number {
	return files.reduce((total, file) => {
		const path = receiptPath(file);
		try {
			return path ? total + statSync(path).size : total;
		} catch {
			return total;
		}
	}, 0);
}
