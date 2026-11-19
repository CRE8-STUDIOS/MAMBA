<!--
  Root layout: wraps every page with the site header.
-->

<script>
	// Global styles (fonts, tokens, base styles) — imported once here so every page gets them
	import '#lib/styles/global.css';
	import favicon from '#lib/assets/favicon.svg';
	import Header from '#lib/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header />

<main>
	{@render children()}
</main>
