// Portfolio: the magazine spreads for the slider.

import { getPortfolioSpreads } from '#lib/api.js';

export async function load() {
	return { spreads: await getPortfolioSpreads() };
}
