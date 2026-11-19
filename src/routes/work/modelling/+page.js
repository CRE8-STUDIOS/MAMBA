// Loads the data for the Modelling page: all published modelling projects.
// The type filters (brands, campaign, runway, magazine) work on this list in the page.

import { getProjects } from '#lib/api.js';

export async function load() {
	return { projects: await getProjects({ category: 'modelling' }) };
}
