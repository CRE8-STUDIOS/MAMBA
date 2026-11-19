// Loads the data for the Work overview: all published projects, so each side
// (model / content creation) can pick a cover image.

import { getProjects } from '#lib/api.js';

export async function load() {
	return { projects: await getProjects() };
}
