// Mette in static/ocr/ i file che servono a leggere gli scontrini.
//
// Vengono tutti da node_modules: nessuno scaricamento da internet, né qui né
// quando l'applicazione gira. La regola "funziona senza internet" resta valida.
// Vedi CLAUDE.md §14.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const DESTINATION = 'static/ocr';

const FILES = [
	'node_modules/tesseract.js/dist/worker.min.js',
	// Tre versioni del motore: il browser sceglie quella che sa usare e ne
	// scarica una sola. I file .wasm.js hanno il motore già dentro: quelli
	// .wasm separati non vengono mai chiesti, quindi non si copiano.
	'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
	'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
	'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
	'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'
];

const missing = FILES.filter((file) => !existsSync(file));
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
console.log(`OCR: ${FILES.length} file copiati in ${DESTINATION}`);
