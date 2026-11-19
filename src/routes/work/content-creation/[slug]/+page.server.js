// One content creation project, e.g. /work/content-creation/cold-culture (404 if not found).

import { loadProjectDetail } from '#lib/api.js';

export const load = ({ params }) => loadProjectDetail('content_creation', params.slug);
