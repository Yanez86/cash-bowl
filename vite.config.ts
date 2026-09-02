import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),

			// Il controllo dell'origine di SvelteKit blocca Safari su iPhone, che
			// senza HTTPS manda "Origin: null". Al suo posto c'è un controllo più
			// solido, che non dipende dalle intestazioni: src/lib/server/csrf.ts
			csrf: { checkOrigin: false }
		})
	]
});
