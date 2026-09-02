// Scarica una copia coerente del database, fatta adesso.
import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '$lib/server/db';
import { backupNow, backupsDir } from '$lib/server/backup';
import { today } from '$lib/server/kakebo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const file = backupNow(db(), `download-${Date.now()}`);
	const path = join(backupsDir(), file);
	const body = readFileSync(path);
	// Era solo di passaggio: non deve restare a occupare posto fra le copie.
	unlinkSync(path);

	return new Response(new Uint8Array(body), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="cash-bowl-${today()}.db"`,
			'Cache-Control': 'no-store'
		}
	});
};
