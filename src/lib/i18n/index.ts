// Impianto multilingua. Una lingua = un file JSON, nessuna libreria.
// Nel codice non deve esistere nessuna stringa visibile: vedi CLAUDE.md §10.
// L'attributo "with" serve a Node quando gira i test: senza, rifiuta il JSON.
import en from './en.json' with { type: 'json' };
import it from './it.json' with { type: 'json' };

export const LOCALES = ['it', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { it: 'Italiano', en: 'English' };

const dictionaries: Record<Locale, unknown> = { it, en };

export function isLocale(value: string): value is Locale {
	return (LOCALES as readonly string[]).includes(value);
}

/** La lingua chiesta dal browser, se la conosciamo. */
export function localeFromHeader(header: string | null, fallback: Locale): Locale {
	for (const part of header?.split(',') ?? []) {
		const tag = part.split(';')[0].trim().slice(0, 2).toLowerCase();
		if (isLocale(tag)) return tag;
	}
	return fallback;
}

export type Vars = Record<string, string | number>;

function lookup(dictionary: unknown, key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, step) =>
				node && typeof node === 'object' ? (node as Record<string, unknown>)[step] : undefined,
			dictionary
		);
}

function fill(template: string, vars?: Vars): string {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
		name in vars ? String(vars[name]) : whole
	);
}

/**
 * Traduttore per una lingua. Se manca una chiave restituisce la chiave stessa:
 * si vede subito, invece di mostrare il vuoto.
 */
export function translator(locale: Locale) {
	return (key: string, vars?: Vars): string => {
		let value = lookup(dictionaries[locale], key);
		if (value === undefined) value = lookup(dictionaries.en, key);

		// Forme del plurale: { "one": "...", "other": "..." }
		if (value && typeof value === 'object' && typeof vars?.count === 'number') {
			const rule = new Intl.PluralRules(locale).select(vars.count);
			const forms = value as Record<string, string>;
			value = forms[rule] ?? forms.other;
		}

		return typeof value === 'string' ? fill(value, vars) : key;
	};
}

export type Translate = ReturnType<typeof translator>;
