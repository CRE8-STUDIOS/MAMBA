// Data functions the pages use to load content from Supabase, plus the
// project URL helper. Failed requests are logged and return an empty value
// ([] or null), so a page shows an empty section instead of crashing.

import { error } from '@sveltejs/kit';
import { supabase } from './supabase.js';

// Allowed project types per category (same as the CHECK constraint in supabase/schema.sql)
const PROJECT_TYPES = {
	modelling: ['brand', 'campaign', 'runway', 'magazine'],
	content_creation: ['brand', 'concept']
};

// Route folder per category — the only place project URLs are defined
const CATEGORY_PATHS = {
	modelling: '/work/modelling',
	content_creation: '/work/content-creation'
};

export function projectUrl(project) {
	return `${CATEGORY_PATHS[project.category]}/${project.slug}`;
}

// Runs a query and turns any error into the fallback value, so the functions
// below don't each need their own try/catch.
async function request(name, query, fallback) {
	try {
		const { data, error: queryError } = await query;
		if (queryError) throw queryError;
		return data ?? fallback;
	} catch (err) {
		console.error(`[api] ${name} failed:`, err.message ?? err);
		return fallback;
	}
}

// Pass only the columns a page needs; defaults to all of them.
export function getProfile(columns = '*') {
	return request(
		'getProfile',
		supabase.from('profile').select(columns).limit(1).maybeSingle(),
		null
	);
}

export function getDigitals() {
	return request(
		'getDigitals',
		supabase.from('digitals').select('id, image_url, alt_text').order('sort_order'),
		[]
	);
}

// Magazine spreads for the Portfolio page. A spread linked to a (published)
// project gets that project's URL as href, so its caption can link to it.
export async function getPortfolioSpreads() {
	const spreads = await request(
		'getPortfolioSpreads',
		supabase
			.from('portfolio_spreads')
			.select('id, image_url, caption, note, project:projects(slug, category)')
			.order('sort_order'),
		[]
	);
	return spreads.map(({ project, ...spread }) => ({
		...spread,
		href: project ? projectUrl(project) : null
	}));
}

// Published projects for a grid. The extra is_published filter keeps drafts
// hidden even for a signed-in user (RLS already hides them from visitors).
export function getProjects({ category, type } = {}) {
	let query = supabase
		.from('projects')
		.select('id, slug, title, category, type, brand_name, cover_image_url')
		.eq('is_published', true)
		.order('sort_order');
	if (category) query = query.eq('category', category);
	if (type) query = query.eq('type', type);
	return request('getProjects', query, []);
}

// One published project with its gallery (sorted). Filtering on category too
// means /work/modelling/cold-culture is a 404, not the content creation project.
export function getProjectBySlug(slug, category) {
	return request(
		'getProjectBySlug',
		supabase
			.from('projects')
			.select('*, project_images(*)')
			.eq('slug', slug)
			.eq('category', category)
			.eq('is_published', true)
			.order('sort_order', { referencedTable: 'project_images' })
			.maybeSingle(),
		null
	);
}

// Shared load for both grid pages: reads ?type=… (unknown types mean "all").
// Each project gets its url here, so the page doesn't import this file and the
// Supabase client stays out of the browser bundle.
export async function loadProjectGrid(category, url) {
	const types = PROJECT_TYPES[category];
	const param = url.searchParams.get('type');
	const type = types.includes(param) ? param : null;
	const projects = await getProjects({ category, type });
	return { types, type, projects: projects.map((p) => ({ ...p, url: projectUrl(p) })) };
}

// Shared load for both detail pages: 404 when the slug isn't found in this category.
export async function loadProjectDetail(category, slug) {
	const project = await getProjectBySlug(slug, category);
	if (!project) error(404, 'Project not found');
	return { project };
}
