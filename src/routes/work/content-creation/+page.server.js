// Content creation grid, filtered by ?type=… (e.g. /work/content-creation?type=concept).

import { loadProjectGrid } from '#lib/api.js';

export const load = ({ url }) => loadProjectGrid('content_creation', url);
