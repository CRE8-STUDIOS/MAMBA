// Loads the published content creation projects for the grid on
// /work/content-creation. The filter comes from ?type=… (e.g. ?type=concept);
// no param or an unknown type means "all".

import { getProjects, PROJECT_TYPES } from '#lib/api.js';

export async function load({ url }) {
	const param = url.searchParams.get('type');
	const type = PROJECT_TYPES.content_creation.includes(param) ? param : null;

	return {
		type,
		projects: await getProjects({ category: 'content_creation', type })
	};
}
