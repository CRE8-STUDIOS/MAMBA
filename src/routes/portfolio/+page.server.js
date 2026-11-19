// Portfolio: the magazine spreads, plus which spread to open. /portfolio?page=3
// opens the third spread so a spread can be shared; anything else opens the first.

import { getPortfolioSpreads } from '#lib/api.js';

export async function load({ url }) {
	const spreads = await getPortfolioSpreads();
	const page = Number(url.searchParams.get('page'));
	const start = Number.isInteger(page) && page >= 1 && page <= spreads.length ? page - 1 : 0;
	return { spreads, start };
}
