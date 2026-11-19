// Loads one content creation project for its detail page, e.g. /work/content-creation/cold-culture.
// Shows the 404 page when the slug doesn't exist or belongs to the other category.

import { error } from '@sveltejs/kit';
import { getProjectBySlug } from '#lib/api.js';

export async function load({ params }) {
	const project = await getProjectBySlug(params.slug, 'content_creation');

	if (!project) {
		error(404, 'Project not found');
	}

	return { project };
}
