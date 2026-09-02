// I controlli sulle foto caricate. Sono la porta più esposta dell'applicazione:
// questi test non si cancellano. Vedi audit.md §1.7
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';

// La cartella dei dati si decide prima di caricare il modulo.
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'cash-bowl-test-'));
const { detectImage, readOrientation, receiptPath, saveReceipt, stripMetadata, MAX_BYTES } =
	await import('../src/lib/server/receipts.ts');

/**
 * Un JPEG finto ma verosimile, con dentro un segmento EXIF pieno di segreti.
 * Con `orientation` il blocco EXIF è quello vero, con il campo del verso.
 */
function jpegWithExif(orientation = 0): Buffer {
	const secrets = Buffer.from('GPSLatitude 45.4642 GPSLongitude 9.1900 iPhone 15', 'latin1');
	const exif = orientation
		? Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiffWithOrientation(orientation), secrets])
		: Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), secrets]);
	const app1 = Buffer.alloc(2 + 2 + exif.length);
	app1.writeUInt16BE(0xffe1, 0);
	app1.writeUInt16BE(exif.length + 2, 2);
	exif.copy(app1, 4);

	const quantisation = Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x11, 0x22]);
	const imageData = Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0x03, 0xff, 0xd9]);
	return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, quantisation, imageData]);
}

/** Il blocco TIFF che una macchina fotografica scrive per dire come era girata. */
function tiffWithOrientation(orientation: number): Buffer {
	const tiff = Buffer.alloc(26);
	tiff.write('MM', 0, 'latin1');
	tiff.writeUInt16BE(42, 2);
	tiff.writeUInt32BE(8, 4);
	tiff.writeUInt16BE(1, 8);
	tiff.writeUInt16BE(0x0112, 10);
	tiff.writeUInt16BE(3, 12);
	tiff.writeUInt32BE(1, 14);
	tiff.writeUInt16BE(orientation, 18);
	tiff.writeUInt32BE(0, 22);
	return tiff;
}

/** Il nostro PNG, con aggiunto un commento che non deve sopravvivere. */
function pngWithComment(): Buffer {
	const original = readFileSync('static/icon-192.png');
	const text = Buffer.from('Comment\0scattata a casa di Anna', 'latin1');
	const chunk = Buffer.alloc(12 + text.length);
	chunk.writeUInt32BE(text.length, 0);
	chunk.write('tEXt', 4, 'latin1');
	text.copy(chunk, 8);
	chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + text.length)), 8 + text.length);

	// Dopo la firma e il primo blocco IHDR (8 + 25 byte).
	const at = 8 + 25;
	return Buffer.concat([original.subarray(0, at), chunk, original.subarray(at)]);
}

test('riconosce le immagini dai byte, non dal nome', () => {
	assert.equal(detectImage(jpegWithExif()), 'jpeg');
	assert.equal(detectImage(readFileSync('static/icon-192.png')), 'png');
	assert.equal(detectImage(Buffer.from('non sono una foto')), null);
	assert.equal(detectImage(Buffer.from('<svg onload="alert(1)"></svg>')), null, 'mai SVG');
	assert.equal(detectImage(Buffer.from('%PDF-1.7')), null);
	assert.equal(detectImage(Buffer.alloc(0)), null);
});

test('toglie la posizione GPS e il modello del telefono dai JPEG', () => {
	const dirty = jpegWithExif();
	assert.ok(dirty.includes('GPSLatitude'), 'la foto di partenza deve avere i metadati');

	const clean = Buffer.from(stripMetadata(dirty, 'jpeg'));
	assert.ok(!clean.includes('GPSLatitude'), 'la posizione non deve sopravvivere');
	assert.ok(!clean.includes('iPhone'), 'il modello non deve sopravvivere');
	assert.ok(!clean.includes('Exif'), 'il segmento EXIF non deve sopravvivere');

	// L'immagine resta un JPEG valido e i dati veri sono intatti.
	assert.equal(detectImage(clean), 'jpeg');
	assert.ok(clean.includes(Buffer.from([0xff, 0xda])), 'i dati dell immagine restano');
	assert.ok(clean.includes(Buffer.from([0xff, 0xdb])), 'le tabelle restano');
});

test('toglie i commenti dai PNG lasciando l immagine intera', () => {
	const dirty = pngWithComment();
	assert.ok(dirty.includes('scattata a casa di Anna'));

	const clean = Buffer.from(stripMetadata(dirty, 'png'));
	assert.ok(!clean.includes('scattata a casa di Anna'), 'il commento non deve sopravvivere');
	assert.equal(detectImage(clean), 'png');
	assert.ok(clean.includes('IHDR') && clean.includes('IDAT') && clean.includes('IEND'));
	assert.deepEqual(clean, readFileSync('static/icon-192.png'), 'torna identico all originale');
});

test('il nome del file non arriva mai da fuori', () => {
	assert.equal(receiptPath('../../../etc/passwd'), null);
	assert.equal(receiptPath('scontrino.jpg'), null);
	assert.equal(receiptPath('../data/cash-bowl.db'), null);
	assert.equal(receiptPath('4d6f4a1e-0000-4000-8000-000000000000.exe'), null);
	assert.ok(receiptPath('4d6f4a1e-0000-4000-8000-000000000000.jpg'));
});

test('rifiuta quello che non è una foto, il vuoto e il troppo grande', () => {
	assert.deepEqual(saveReceipt(Buffer.alloc(0)), { ok: false, key: 'errors.receiptEmpty' });

	const fakeJpeg = Buffer.from('in realtà sono un testo travestito da .jpg');
	assert.deepEqual(saveReceipt(fakeJpeg), { ok: false, key: 'errors.receiptNotAnImage' });

	const enormous = Buffer.alloc(MAX_BYTES + 1);
	assert.deepEqual(saveReceipt(enormous), { ok: false, key: 'errors.receiptTooBig' });
});

test('salva con un nome nuovo e già ripulito', () => {
	const result = saveReceipt(jpegWithExif());
	assert.ok(result.ok);

	const path = receiptPath(result.file);
	assert.ok(path, 'il nome generato deve essere accettato dal controllo');

	const written = readFileSync(path);
	assert.ok(!written.includes('GPSLatitude'), 'sul disco non finisce la posizione');
	assert.equal(detectImage(written), 'jpeg');

	// Due salvataggi della stessa foto danno due file diversi.
	const second = saveReceipt(jpegWithExif());
	assert.ok(second.ok);
	assert.notEqual(second.file, result.file);
});

test('il verso della foto sopravvive, i segreti no', () => {
	const storta = jpegWithExif(6); // scattata girando il telefono
	assert.equal(readOrientation(storta), 6);
	assert.ok(storta.includes('GPSLatitude'));

	const clean = Buffer.from(stripMetadata(storta, 'jpeg'));
	assert.equal(readOrientation(clean), 6, 'il browser deve poterla raddrizzare da solo');
	assert.ok(!clean.includes('GPSLatitude'), 'ma la posizione non deve restare');
	assert.ok(!clean.includes('iPhone'), 'né il modello');
	assert.equal(detectImage(clean), 'jpeg');

	// Il blocco che riscriviamo è minuscolo: dentro non ci sta nient'altro.
	assert.ok(clean.length < storta.length, 'la foto ripulita è più piccola');
});

test('una foto dritta non si porta dietro nessun blocco EXIF', () => {
	const dritta = jpegWithExif(1);
	const clean = Buffer.from(stripMetadata(dritta, 'jpeg'));
	assert.equal(readOrientation(clean), 1);
	assert.ok(!clean.includes('Exif'), 'senza niente da dire, non si scrive niente');
});

test('un verso senza senso viene ignorato', () => {
	assert.equal(readOrientation(jpegWithExif(99)), 1);
	assert.equal(readOrientation(jpegWithExif()), 1, 'EXIF senza il campo del verso');
	assert.equal(readOrientation(readFileSync('static/icon-192.png')), 1, 'un PNG non ne ha');
});
