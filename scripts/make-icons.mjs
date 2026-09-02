// Genera le icone PNG dell'applicazione senza nessuna libreria: si disegnano i
// pixel e si impacchettano con zlib, che è già dentro Node.
// Si rilancia solo se cambia il disegno:  node scripts/make-icons.mjs
import { crc32, deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const ACCENT = [26, 97, 82]; // --accent-light della palette Kakebo
const INK = [255, 255, 255];

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, checksum]);
}

function png(size, pixel) {
	const rows = [];
	for (let y = 0; y < size; y++) {
		const row = Buffer.alloc(1 + size * 4); // il primo byte è il filtro: nessuno
		for (let x = 0; x < size; x++) {
			const [r, g, b, a] = pixel(x, y);
			row.set([r, g, b, a], 1 + x * 4);
		}
		rows.push(row);
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(size, 0);
	header.writeUInt32BE(size, 4);
	header.set([8, 6, 0, 0, 0], 8); // 8 bit per canale, RGBA
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/**
 * Una ciotola bianca piena su fondo colorato, con una moneta che ci cade dentro.
 * `inset` lascia il margine che Android ritaglia sulle icone "maskable".
 * `rounded` arrotonda gli angoli quando l'icona non viene ritagliata da altri.
 */
function bowl({ size, inset = 0, rounded = false }) {
	const pad = size * inset;
	const span = size - pad * 2;
	const cx = size / 2;
	const rimY = pad + span * 0.56;
	const rimHalf = span * 0.33;
	const rimThickness = span * 0.055;
	const bodyR = span * 0.3;
	const coinR = span * 0.105;
	const coinX = cx + span * 0.21;
	const coinY = pad + span * 0.33;
	const corner = size * 0.22;

	return (x, y) => {
		const px = x + 0.5;
		const py = y + 0.5;

		if (rounded) {
			const dx = Math.max(corner - px, px - (size - corner), 0);
			const dy = Math.max(corner - py, py - (size - corner), 0);
			if (Math.hypot(dx, dy) > corner) return [0, 0, 0, 0];
		}

		// Il bordo della ciotola: una barra piena, più larga del corpo.
		const onRim = Math.abs(py - rimY) <= rimThickness / 2 && Math.abs(px - cx) <= rimHalf;
		// Il corpo: mezzo disco pieno sotto il bordo.
		const inBody = py > rimY && Math.hypot(px - cx, py - rimY) <= bodyR;
		// La moneta: piccola e spostata di lato, così non sembra un occhio.
		const inCoin = Math.hypot(px - coinX, py - coinY) <= coinR;

		return onRim || inBody || inCoin ? [...INK, 255] : [...ACCENT, 255];
	};
}

const icons = [
	['static/icon-192.png', 192, { inset: 0, rounded: true }],
	['static/icon-512.png', 512, { inset: 0, rounded: true }],
	['static/icon-maskable-512.png', 512, { inset: 0.12, rounded: false }],
	['static/apple-touch-icon.png', 180, { inset: 0.06, rounded: false }]
];

for (const [path, size, options] of icons) {
	writeFileSync(path, png(size, bowl({ size, ...options })));
	console.log('scritto', path);
}
