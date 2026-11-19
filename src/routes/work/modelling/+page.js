// Loads the published modelling projects for the grid on /work/modelling.
// The filter comes from ?type=… (e.g. ?type=campaign); no param or an unknown
// type means "all".

import { getProjects, PROJECT_TYPES } from '#lib/api.js';

export async function load({ url }) {
	const param = url.searchParams.get('type');
	const type = PROJECT_TYPES.modelling.includes(param) ? param : null;

	return {
		type,
		projects: await getProjects({ category: 'modelling', type })
	};
}
