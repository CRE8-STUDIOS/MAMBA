// Vite + SvelteKit config: compiler options and the deploy adapter.

import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Runes mode for our own components; libraries in node_modules decide for themselves
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto picks the right adapter for the host (Vercel, Netlify, …).
			// Swap it for a specific adapter once the hosting is decided.
			adapter: adapter()
		})
	]
});
