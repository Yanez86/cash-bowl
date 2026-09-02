import type { Translate } from './i18n';

/** Il nome di una categoria: le quattro radici si traducono, le figlie no. */
export function categoryLabel(t: Translate, rootKey: string, child: string | null): string {
	const root = t(`categories.${rootKey}`);
	return child ? `${root} · ${child}` : root;
}
