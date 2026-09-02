// I valori ammessi per l'aspetto, in un posto solo: li usano sia la pagina del
// profilo sia il controllo lato server. Le palette sono definite in themes.css.
export const THEMES = ['auto', 'light', 'dark'] as const;
export const ACCENTS = ['kakebo', 'forest', 'amber', 'night', 'grey'] as const;

export const THEME_LABEL = {
	auto: 'profile.themeAuto',
	light: 'profile.themeLight',
	dark: 'profile.themeDark'
} as const;

export const ACCENT_LABEL = {
	kakebo: 'profile.accentKakebo',
	forest: 'profile.accentForest',
	amber: 'profile.accentAmber',
	night: 'profile.accentNight',
	grey: 'profile.accentGrey'
} as const;
