// Le foto degli scontrini. Tutto quello che arriva da fuori è sospetto:
// si controlla il tipo dai byte, si ripuliscono i metadati, si genera un nome
// nuovo e si salva fuori dalla cartella pubblica. Vedi CLAUDE.md §8.1
import { randomUUID } from 'node:crypto';
import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, type DB } from './db.ts';

/** Limite sul singolo file, controllato sul server e non solo nel browser. */
export const MAX_BYTES = 4 * 1024 * 1024;

/** Quante foto può avere una spesa. Un tetto serve: il disco è di casa. */
export const MAX_PER_ENTRY = 5;

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
 *
 * Unica cosa che sopravvive: il verso in cui è stata scattata. Non si tiene il
 * blocco originale — si legge quel numero e se ne riscrive uno nuovo, fatto solo
 * di quello. Così il browser raddrizza la foto da solo e non resta nient'altro.
 */
export function stripMetadata(bytes: Uint8Array, kind: ImageKind): Uint8Array {
	return kind === 'jpeg' ? stripJpeg(bytes) : stripPng(bytes);
}

/**
 * Il verso della foto secondo i metadati: 1 è dritta, gli altri valori fino a 8
 * dicono come va girata. Se non c'è o non si capisce, 1.
 */
export function readOrientation(bytes: Uint8Array): number {
	const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let at = 2;

	while (at + 4 <= view.length && view[at] === 0xff) {
		const marker = view[at + 1];
		if (marker === 0xda) break; // iniziano i dati dell'immagine
		const length = view.readUInt16BE(at + 2);
		if (length < 2 || at + 2 + length > view.length) break;

		if (marker === 0xe1 && view.toString('latin1', at + 4, at + 10) === 'Exif\0\0') {
			const found = orientationInExif(view.subarray(at + 10, at + 2 + length));
			if (found) return found;
		}
		at += 2 + length;
	}
	return 1;
}

/** Cerca il campo 0x0112 nella prima directory del blocco TIFF dentro l'EXIF. */
function orientationInExif(tiff: Buffer): number | null {
	if (tiff.length < 14) return null;
	const order = tiff.toString('latin1', 0, 2);
	if (order !== 'II' && order !== 'MM') return null;

	const little = order === 'II';
	const u16 = (at: number) => (little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
	const u32 = (at: number) => (little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at));

	const first = u32(4);
	if (first + 2 > tiff.length) return null;

	const entries = u16(first);
	for (let index = 0; index < entries; index++) {
		const at = first + 2 + index * 12;
		if (at + 12 > tiff.length) break;
		if (u16(at) === 0x0112) {
			const value = u16(at + 8);
			return value >= 1 && value <= 8 ? value : null;
		}
	}
	return null;
}

/**
 * Un blocco EXIF costruito da noi, con dentro un solo campo: il verso della
 * foto. Niente altro può nascondersi qui: lo scriviamo byte per byte.
 */
function orientationBlock(orientation: number): Buffer {
	const block = Buffer.alloc(36);
	block.writeUInt16BE(0xffe1, 0); // segmento APP1
	block.writeUInt16BE(34, 2); // lunghezza, senza il marcatore
	block.write('Exif\0\0', 4, 'latin1');
	block.write('MM', 10, 'latin1'); // byte più pesante per primo
	block.writeUInt16BE(42, 12);
	block.writeUInt32BE(8, 14); // dove comincia la prima directory
	block.writeUInt16BE(1, 18); // un campo solo
	block.writeUInt16BE(0x0112, 20); // il campo "orientamento"
	block.writeUInt16BE(3, 22); // di tipo numero corto
	block.writeUInt32BE(1, 24); // uno
	block.writeUInt16BE(orientation, 28);
	block.writeUInt32BE(0, 32); // non c'è una seconda directory
	return block;
}

/** Nei JPEG i metadati stanno nei segmenti APPn e nei commenti: si saltano. */
function stripJpeg(bytes: Uint8Array): Uint8Array {
	const orientation = readOrientation(bytes);
	const keep: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
	if (orientation !== 1) keep.push(orientationBlock(orientation));
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

// --- le foto di una spesa, nel database -------------------------------------
//
// La regola di riservatezza è sempre quella: si arriva a una foto solo passando
// dalla spesa a cui appartiene, e solo se quella spesa si può vedere.
const VISIBLE = "(x.visibility = 'family' OR x.created_by = @viewer)";

export type ReceiptRow = { id: number; file: string; position: number };

export function listReceipts(db: DB, transactionId: number, viewer: number): ReceiptRow[] {
	return db
		.prepare(
			`SELECT r.id, r.file, r.position FROM receipts r
			 JOIN transactions x ON x.id = r.transaction_id
			 WHERE r.transaction_id = @id AND ${VISIBLE}
			 ORDER BY r.position, r.id`
		)
		.all({ id: transactionId, viewer }) as ReceiptRow[];
}

/** Una singola foto, solo se chi guarda può vedere la spesa a cui appartiene. */
export function findReceipt(db: DB, receiptId: number, viewer: number): ReceiptRow | null {
	return (
		(db
			.prepare(
				`SELECT r.id, r.file, r.position FROM receipts r
				 JOIN transactions x ON x.id = r.transaction_id
				 WHERE r.id = @id AND ${VISIBLE}`
			)
			.get({ id: receiptId, viewer }) as ReceiptRow | undefined) ?? null
	);
}

export function countReceipts(db: DB, transactionId: number): number {
	return (
		db
			.prepare('SELECT COUNT(*) AS n FROM receipts WHERE transaction_id = ?')
			.get(transactionId) as { n: number }
	).n;
}

/** Aggiunge una foto in fondo. Restituisce false se la spesa è già piena. */
export function addReceipt(db: DB, transactionId: number, file: string): boolean {
	if (countReceipts(db, transactionId) >= MAX_PER_ENTRY) return false;
	const last = (
		db
			.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM receipts WHERE transaction_id = ?')
			.get(transactionId) as { m: number }
	).m;
	db.prepare('INSERT INTO receipts (transaction_id, file, position) VALUES (?, ?, ?)').run(
		transactionId,
		file,
		last + 1
	);
	return true;
}

/** Toglie una foto e restituisce il file da cancellare dal disco. */
export function removeReceipt(db: DB, receiptId: number, viewer: number): string | null {
	const row = findReceipt(db, receiptId, viewer);
	if (!row) return null;
	db.prepare('DELETE FROM receipts WHERE id = ?').run(receiptId);
	return row.file;
}

/** Tutti i file di una spesa: serve quando la spesa viene cancellata. */
export function filesOf(db: DB, transactionId: number): string[] {
	return (
		db.prepare('SELECT file FROM receipts WHERE transaction_id = ?').all(transactionId) as {
			file: string;
		}[]
	).map((row) => row.file);
}

/** Tutti i file salvati: serve alla pagina di manutenzione. */
export function allFiles(db: DB): string[] {
	return (db.prepare('SELECT file FROM receipts').all() as { file: string }[]).map(
		(row) => row.file
	);
}
