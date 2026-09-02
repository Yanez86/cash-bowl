// L'OCR c'è solo se i suoi file sono stati copiati al momento della build.
// Senza, il pulsante non compare: meglio niente pulsante che un pulsante rotto.
import { existsSync } from 'node:fs';

const CANDIDATES = ['static/ocr/eng.traineddata.gz', 'build/client/ocr/eng.traineddata.gz'];

let known: boolean | undefined;

export function ocrAvailable(): boolean {
	known ??= CANDIDATES.some((path) => existsSync(path));
	return known;
}
