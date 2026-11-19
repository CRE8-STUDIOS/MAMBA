// The one Supabase client the whole site shares.
//
// Only the publishable (anon) key is used here. The secret/service_role key
// bypasses Row Level Security and must never end up in frontend code.

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$app/env/public';

// The site only reads public content, so there's no login session to keep.
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: { persistSession: false }
});
