<!--
  Home page: the full-screen hero video with the MAMBA title.
  Video and poster come from the profile loaded in +layout.server.js.
-->

<script>
	import HeroVideo from '#lib/components/HeroVideo.svelte';

	let { data } = $props();
</script>

<HeroVideo src={data.profile?.hero_media_url} poster={data.profile?.hero_poster_url} />
