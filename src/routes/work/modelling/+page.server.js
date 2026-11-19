// Modelling grid, filtered by ?type=… (e.g. /work/modelling?type=campaign).

import { loadProjectGrid } from '#lib/api.js';

export const load = ({ url }) => loadProjectGrid('modelling', url);
