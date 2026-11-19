// Loads the data for the Content creation page: all published content projects.
// The type filters (brands, concepts) work on this list in the page.

import { getProjects } from '#lib/api.js';

export async function load() {
	return { projects: await getProjects({ category: 'content_creation' }) };
}
