// I contrasti si verificano, non si sperano: una palette che non passa non entra.
// Vedi CLAUDE.md §9 e audit.md §2.4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/lib/themes.css', 'utf8');

/** I token colore di un blocco CSS, per esempio :root o [data-accent='amber']. */
function tokens(selector: string): Record<string, string> {
	const escaped = selector.replace(/[[\]'.*+?^${}()|\\]/g, '\\$&');
	const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
	assert.ok(block, `blocco non trovato: ${selector}`);
	const found: Record<string, string> = {};
	for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
		found[name] = value;
	}
	return found;
}

function luminance(hex: string): number {
	const channel = (start: number) => {
		const value = parseInt(hex.slice(start, start + 2), 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function ratio(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

const base = tokens(':root');
const PALETTES = ['kakebo', 'forest', 'amber', 'night', 'grey'];

const paletteTokens = (name: string) =>
	name === 'kakebo' ? base : { ...base, ...tokens(`[data-accent='${name}']`) };

for (const mode of ['light', 'dark'] as const) {
	test(`testo e sfondo leggibili nel tema ${mode}`, () => {
		const value = ratio(base[`text-${mode}`], base[`bg-${mode}`]);
		assert.ok(value >= 7, `testo su sfondo: ${value.toFixed(2)}:1, serve almeno 7`);
	});

	test(`testo secondario leggibile nel tema ${mode}`, () => {
		const value = ratio(base[`muted-${mode}`], base[`bg-${mode}`]);
		assert.ok(value >= 4.5, `testo secondario: ${value.toFixed(2)}:1, serve almeno 4,5`);
	});

	test(`bordi distinguibili nel tema ${mode}`, () => {
		const value = ratio(base[`border-${mode}`], base[`bg-${mode}`]);
		assert.ok(value >= 3, `bordi: ${value.toFixed(2)}:1, serve almeno 3`);
	});

	test(`messaggi di errore leggibili nel tema ${mode}`, () => {
		const value = ratio(base[`danger-${mode}`], base[`bg-${mode}`]);
		assert.ok(value >= 4.5, `errori: ${value.toFixed(2)}:1, serve almeno 4,5`);
	});

	for (const palette of PALETTES) {
		test(`palette ${palette}, tema ${mode}: accento leggibile`, () => {
			const colors = paletteTokens(palette);
			const onBackground = ratio(colors[`accent-${mode}`], colors[`bg-${mode}`]);
			assert.ok(
				onBackground >= 4.5,
				`accento su sfondo: ${onBackground.toFixed(2)}:1, serve almeno 4,5`
			);

			const onAccent = ratio(colors[`accent-fg-${mode}`], colors[`accent-${mode}`]);
			assert.ok(
				onAccent >= 4.5,
				`scritta sul pulsante: ${onAccent.toFixed(2)}:1, serve almeno 4,5`
			);
		});
	}
}
