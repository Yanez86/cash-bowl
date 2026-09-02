// La foto di uno scontrino non ha un indirizzo diretto: si passa sempre di qui,
// e qui si controlla chi sei. Una foto di una spesa privata altrui non deve
// essere raggiungibile in nessun modo. Vedi audit.md §1.7
import { error } from '@sveltejs/kit';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { db } from '$lib/server/db';
import { getEntry } from '$lib/server/kakebo';
import { MIME, receiptKind, receiptPath } from '$lib/server/receipts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'errors.entryNotFound');

	// getEntry filtra per visibilità: se non puoi vederla, per te non esiste.
	const entry = getEntry(db(), id, locals.user!.id);
	const path = entry?.receipt_file ? receiptPath(entry.receipt_file) : null;
	if (!path) error(404, 'errors.entryNotFound');

	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		error(404, 'errors.entryNotFound');
	}

	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, {
		headers: {
			'Content-Type': MIME[receiptKind(entry!.receipt_file!)],
			'Content-Length': String(size),
			'Content-Disposition': 'inline',
			// Il browser non deve mai provare a interpretare questo file come
			// qualcosa di diverso da un'immagine, né eseguirne il contenuto.
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'; sandbox",
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
