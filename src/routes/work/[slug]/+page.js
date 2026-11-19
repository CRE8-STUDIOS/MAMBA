// Loads one project (with its gallery images) for the detail page.
// Shows SvelteKit's 404 page when the slug doesn't match a published project.

import { error } from '@sveltejs/kit';
import { getProjectBySlug } from '#lib/api.js';

export async function load({ params }) {
	const project = await getProjectBySlug(params.slug);

	if (!project) {
		error(404, 'Project not found');
	}

	return { project };
}
