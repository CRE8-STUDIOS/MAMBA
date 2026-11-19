<!--
  Root layout: wraps every page with the site header. The header gets the
  menu character from the profile loaded in +layout.server.js.
-->

<script>
	import favicon from '#lib/assets/favicon.svg';
	import Header from '#lib/components/Header.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header menuCharacter={data.profile?.menu_character_url} />

<main>
	{@render children()}
</main>
