import { db } from '$lib/server/db';
import { refuse } from '$lib/server/problem';
import { backupNow, backupsDir, listBackups, KEEP, rotate } from '$lib/server/backup';
import { importData } from '$lib/server/transfer';
import { receiptBytes, receiptsDir } from '$lib/server/receipts';
import { today } from '$lib/server/kakebo';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '$lib/server/db';
import pkg from '../../../../package.json' with { type: 'json' };
import type { Actions, PageServerLoad } from './$types';

/** Un file esportato più grande di così non è un file esportato. */
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

const sizeOf = (path: string): number => {
	try {
		return statSync(path).size;
	} catch {
		return 0;
	}
};

function counts() {
	const one = (sql: string) => (db().prepare(sql).get() as { n: number }).n;
	return {
		users: one('SELECT COUNT(*) AS n FROM users'),
		entries: one("SELECT COUNT(*) AS n FROM transactions WHERE status = 'complete'"),
		drafts: one("SELECT COUNT(*) AS n FROM transactions WHERE status = 'draft'"),
		receipts: one('SELECT COUNT(*) AS n FROM transactions WHERE receipt_file IS NOT NULL')
	};
}

export const load: PageServerLoad = () => {
	const files = db()
		.prepare('SELECT receipt_file FROM transactions WHERE receipt_file IS NOT NULL')
		.all() as { receipt_file: string }[];

	return {
		version: pkg.version,
		counts: counts(),
		databaseBytes: sizeOf(join(DATA_DIR, 'cash-bowl.db')),
		receiptBytes: receiptBytes(files.map((row) => row.receipt_file)),
		backups: listBackups().slice(0, 20),
		keep: KEEP,
		paths: { data: DATA_DIR, backups: backupsDir(), receipts: receiptsDir() },
		migrations: db().prepare('SELECT name, applied_at FROM migrations ORDER BY name').all() as {
			name: string;
			applied_at: string;
		}[]
	};
};

export const actions: Actions = {
	backup: () => {
		const stamp = new Date().toISOString().replace(/[:.]/g, '-');
		const file = backupNow(db(), `manual-${stamp}`);
		return { backedUp: file };
	},

	rotate: () => ({ rotated: rotate().length }),

	restore: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('backup');
		if (!(file instanceof File) || file.size === 0) return refuse(400, 'errors.importNotAFile');
		if (file.size > MAX_IMPORT_BYTES) return refuse(400, 'errors.importTooBig');

		let parsed: unknown;
		try {
			parsed = JSON.parse(await file.text());
		} catch {
			return refuse(400, 'errors.importNotAFile');
		}

		// Prima di sovrascrivere tutto, una copia di quello che c'è adesso.
		backupNow(db(), `before-import-${today()}-${Date.now()}`);

		const result = importData(db(), parsed);
		if (!result.ok) return refuse(400, result.key);

		// Le sessioni sono sparite con il resto: tutti devono rientrare.
		return { imported: result.counts.transactions };
	}
};
