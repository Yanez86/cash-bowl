// Mette in static/ocr/ i file che servono a leggere gli scontrini.
//
// Vengono tutti da node_modules: nessuno scaricamento da internet, né qui né
// quando l'applicazione gira. La regola "funziona senza internet" resta valida.
// Vedi CLAUDE.md §14.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const DESTINATION = 'static/ocr';

const FILES = [
	'node_modules/tesseract.js/dist/worker.min.js',
	// Tre versioni del motore: il browser sceglie quella che sa usare e ne
	// scarica una sola. I file .wasm.js hanno il motore già dentro: quelli
	// .wasm separati non vengono mai chiesti, quindi non si copiano.
	'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
	'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
	'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js'
];

/**
 * I dati della lingua arrivano compressi, ma si salvano **scompattati**.
 * Il motivo è un dettaglio che morde solo nella cosa vera: un file che finisce
 * in .gz viene servito come "già compresso", il browser lo scompatta da solo,
 * e poi la libreria prova a scompattarlo una seconda volta e si rompe.
 * Scompattandolo qui, il server lo comprime in viaggio come qualunque altro
 * file: stessi byte sulla rete, nessuna ambiguità.
 */
const LANGUAGE = 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';

const missing = [...FILES, LANGUAGE].filter((file) => !existsSync(file));
if (missing.length > 0) {
	// Non è un errore fatale: senza questi file l'applicazione funziona lo
	// stesso, semplicemente senza il pulsante che legge l'importo.
	console.warn('OCR: file mancanti, la lettura degli scontrini resterà spenta.');
	for (const file of missing) console.warn('  -', file);
	process.exit(0);
}

mkdirSync(DESTINATION, { recursive: true });
for (const file of FILES) {
	copyFileSync(file, `${DESTINATION}/${file.split('/').pop()}`);
}
writeFileSync(`${DESTINATION}/eng.traineddata`, gunzipSync(readFileSync(LANGUAGE)));
console.log(`OCR: ${FILES.length + 1} file copiati in ${DESTINATION}`);
