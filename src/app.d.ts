import type { SessionUser } from '$lib/server/auth';
import type { Locale } from '$lib/i18n';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			locale: Locale;
		}
	}
}

export {};
