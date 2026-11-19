// Loads the profile fields the layout and home page need, once for the whole
// site: the menu sticker (Header, every page) and the hero video + poster (home).
// Pages get this through their data prop, so home needs no load of its own.

import { getProfile } from '#lib/api.js';

export async function load() {
	return { profile: await getProfile('hero_media_url, hero_poster_url, menu_image_url') };
}
