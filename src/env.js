// Environment variable definitions. SvelteKit reads these from .env and
// makes them importable from $app/env/public.

import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	// Supabase project URL, e.g. https://xxxx.supabase.co
	PUBLIC_SUPABASE_URL: {
		public: true,
		static: true,
		description: 'Supabase project URL'
	},

	// Publishable (anon) key — safe in the browser because RLS limits what it can do.
	// Never put the secret/service_role key here.
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		static: true,
		description: 'Supabase publishable (anon) key'
	}
});
