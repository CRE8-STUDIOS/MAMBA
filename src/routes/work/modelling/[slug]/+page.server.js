// One modelling project, e.g. /work/modelling/puma-x-horati (404 if not found).

import { loadProjectDetail } from '#lib/api.js';

export const load = ({ params }) => loadProjectDetail('modelling', params.slug);
