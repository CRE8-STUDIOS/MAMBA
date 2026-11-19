// Digitals: profile stats/bio and the 2x2 photo grid, fetched in parallel.

import { getProfile, getDigitals } from '#lib/api.js';

export async function load() {
	const [profile, digitals] = await Promise.all([getProfile(), getDigitals()]);
	return { profile, digitals };
}
