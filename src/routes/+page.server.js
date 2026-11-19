// Home: the profile, for the hero image/video.

import { getProfile } from '#lib/api.js';

export async function load() {
	return { profile: await getProfile() };
}
