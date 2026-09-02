// Legge l'importo da una foto, nel browser.
//
// Il motore e i dati della lingua stanno in /ocr/, dentro l'installazione:
// niente scaricamenti da internet. Si caricano solo quando qualcuno preme il
// pulsante, e poi il browser se li tiene. Vedi CLAUDE.md §14.
import { findAmount } from './receipt-amount';

const OCR_PATH = '/ocr';

export type Progress = (percent: number) => void;

/** L'importo trovato, in centesimi, oppure null. */
export async function readAmount(image: string, onProgress?: Progress): Promise<number | null> {
	const { createWorker } = await import('tesseract.js');

	const worker = await createWorker('eng', 1, {
		workerPath: `${OCR_PATH}/worker.min.js`,
		corePath: OCR_PATH,
		langPath: OCR_PATH,
		logger: (message: { status: string; progress: number }) => {
			if (message.status === 'recognizing text') onProgress?.(Math.round(message.progress * 100));
		}
	});

	try {
		const { data } = await worker.recognize(image);
		return findAmount(data.text);
	} finally {
		await worker.terminate();
	}
}
