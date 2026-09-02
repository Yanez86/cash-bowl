import { db } from '$lib/server/db';

export function load() {
	const count = (sql: string) => (db().prepare(sql).get() as { n: number }).n;
	return {
		migrations: count('SELECT COUNT(*) AS n FROM migrations'),
		users: count('SELECT COUNT(*) AS n FROM users')
	};
}
