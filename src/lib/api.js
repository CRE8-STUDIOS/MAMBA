// Data functions the pages use to load content from Supabase.
// Each one catches its own errors, logs them and returns an empty value
// ([] or null), so a failed request shows an empty section instead of a crash.

import { supabase } from './supabase.js';

// Allowed project types per category (same values as the CHECK constraint in
// supabase/schema.sql). The list pages use this to ignore unknown ?type= values.
export const PROJECT_TYPES = {
	modelling: ['brand', 'campaign', 'runway', 'magazine'],
	content_creation: ['brand', 'concept']
};

// Route folder for each category, so URL logic lives in one place.
const CATEGORY_PATHS = {
	modelling: '/work/modelling',
	content_creation: '/work/content-creation'
};

// Link to a project's detail page, e.g. /work/content-creation/cold-culture.
export function projectUrl(project) {
	return `${CATEGORY_PATHS[project.category]}/${project.slug}`;
}

// Shared error logger so every failure looks the same in the console.
function logError(fn, error) {
	console.error(`[api] ${fn} failed:`, error?.message ?? error);
}

// The single profile row (stats, bio, headshot, hero, socials), or null.
export async function getProfile() {
	try {
		const { data, error } = await supabase.from('profile').select('*').limit(1).maybeSingle();
		if (error) throw error;
		return data;
	} catch (error) {
		logError('getProfile', error);
		return null;
	}
}

// Photos for the 2x2 grid on the Digitals page.
export async function getDigitals() {
	try {
		const { data, error } = await supabase
			.from('digitals')
			.select('*')
			.order('sort_order', { ascending: true });
		if (error) throw error;
		return data ?? [];
	} catch (error) {
		logError('getDigitals', error);
		return [];
	}
}

// Magazine spreads for the Portfolio slider.
export async function getPortfolioSpreads() {
	try {
		const { data, error } = await supabase
			.from('portfolio_spreads')
			.select('*')
			.order('sort_order', { ascending: true });
		if (error) throw error;
		return data ?? [];
	} catch (error) {
		logError('getPortfolioSpreads', error);
		return [];
	}
}

// Published projects, optionally filtered by category and/or type.
// e.g. getProjects({ category: 'modelling', type: 'runway' })
export async function getProjects({ category, type } = {}) {
	try {
		// RLS already hides drafts from visitors; the extra filter keeps them
		// hidden even if someone is signed in.
		let query = supabase
			.from('projects')
			.select('*')
			.eq('is_published', true)
			.order('sort_order', { ascending: true });

		if (category) query = query.eq('category', category);
		if (type) query = query.eq('type', type);

		const { data, error } = await query;
		if (error) throw error;
		return data ?? [];
	} catch (error) {
		logError('getProjects', error);
		return [];
	}
}

// One published project by slug within a category, with its gallery in
// project.project_images (sorted by sort_order). Returns null if it doesn't
// exist — including when the slug belongs to the other category, so
// /work/modelling/cold-culture is a 404.
export async function getProjectBySlug(slug, category) {
	if (!slug || !category) return null;
	try {
		const { data, error } = await supabase
			.from('projects')
			.select('*, project_images(*)')
			.eq('slug', slug)
			.eq('category', category)
			.eq('is_published', true)
			.order('sort_order', { referencedTable: 'project_images', ascending: true })
			.maybeSingle();
		if (error) throw error;
		return data;
	} catch (error) {
		logError('getProjectBySlug', error);
		return null;
	}
}
