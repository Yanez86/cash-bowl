// Tutti i dati in un file leggibile, per portarli altrove o rimetterli dentro.
import { db } from '$lib/server/db';
import { today } from '$lib/server/kakebo';
import { exportData } from '$lib/server/transfer';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const body = JSON.stringify(exportData(db()), null, '\t');
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="cash-bowl-${today()}.json"`,
			'Cache-Control': 'no-store'
		}
	});
};
