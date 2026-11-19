// Loads the data for the Digitals page: profile stats/bio and the digitals grid.

import { getProfile, getDigitals } from '#lib/api.js';

export async function load() {
	// Both requests run at the same time
	const [profile, digitals] = await Promise.all([getProfile(), getDigitals()]);
	return { profile, digitals };
}
