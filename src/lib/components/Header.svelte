<!--
  Site header on every page: MAMBA logo, the scribble menu button and the menu
  card (Digitals, Portfolio, Work + sticker). White and on top of the hero on the
  home page, black in the normal page flow everywhere else.
-->

<script>
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';

	let { menuImage } = $props();

	let isOpen = $state(false);
	let button = $state();
	let menu = $state();

	const isHome = $derived(page.route.id === '/');

	// Close the menu after moving to another page, so it isn't still open there.
	afterNavigate(() => {
		isOpen = false;
	});

	// Escape closes the menu and puts focus back on the button.
	function onKeydown(event) {
		if (isOpen && event.key === 'Escape') {
			isOpen = false;
			button.focus();
		}
	}

	// A click anywhere outside the card and the button closes the menu.
	// composedPath() is used because the clicked icon span may already be swapped
	// out of the DOM by the time this runs, so contains() would miss it.
	function onWindowClick(event) {
		const path = event.composedPath();
		if (isOpen && !path.includes(menu) && !path.includes(button)) {
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} onclick={onWindowClick} />

<header class:home={isHome}>
	<a class="logo font-display" href="/">MAMBA</a>

	<button
		bind:this={button}
		class="toggle"
		class:open={isOpen}
		type="button"
		aria-label={isOpen ? 'Close menu' : 'Open menu'}
		aria-expanded={isOpen}
		aria-controls="main-nav"
		onclick={() => (isOpen = !isOpen)}
	>
		{#if isOpen}
			<span class="icon close close-1"></span>
			<span class="icon close close-2"></span>
		{:else}
			<span class="icon burger"></span>
		{/if}
	</button>

	<nav bind:this={menu} id="main-nav" class="menu" class:open={isOpen}>
		<ul>
			<li><a class="font-graffiti" href="/digitals">Digitals</a></li>
			<li><a class="font-graffiti" href="/portfolio">Portfolio</a></li>
			<li><a class="font-graffiti" href="/work">Work</a></li>
		</ul>

		{#if menuImage}
			<img class="sticker" src={menuImage} alt="" />
		{/if}
	</nav>
</header>

<style>
	/* Pixel offsets below are taken from the Figma frame (1440px); there are no
	   tokens for them. */
	header {
		position: relative;
		z-index: 10;
		padding: 22px 29px;
		color: var(--color-text);
	}

	/* Home: float over the hero video in white */
	header.home {
		position: absolute;
		inset: 0 0 auto;
		color: var(--color-text-inverse);
	}

	.logo {
		font-size: var(--text-logo);
		line-height: var(--leading-tight);
	}

	/* The SVG files are drawn as masks so they take the text colour (white or black).
	   Sizes match the SVGs, which include a few px of padding for the scribble filter. */
	.icon {
		display: block;
		background-color: currentColor;
		mask: var(--icon) no-repeat center / 100% 100%;
	}

	.burger {
		--icon: url('/icons/menu.svg');
		width: 79px;
		height: 23px;
	}

	.close {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 87px;
		height: 13px;
	}

	.close-1 {
		--icon: url('/icons/close-line-1.svg');
		transform: translate(-50%, -50%) rotate(13.7deg);
	}

	.close-2 {
		--icon: url('/icons/close-line-2.svg');
		transform: translate(-50%, -50%) rotate(-13.7deg);
	}

	/* The 10px padding makes a bigger tap target without moving the icon off its
	   Figma spot (lines at top 35px, right 29px). Sits above the menu card. */
	.toggle {
		position: absolute;
		z-index: 1;
		top: 21px;
		right: 15px;
		display: grid;
		place-items: center;
		min-width: 99px;
		min-height: 43px;
		padding: 10px;
	}

	/* The card is dark on every page, so the X is always white */
	.toggle.open {
		color: var(--color-white);
	}

	/* Menu card. Hidden with visibility (not display) so it can fade and scale;
	   visibility switches after the fade so links can't be tabbed to when closed. */
	.menu {
		position: absolute;
		top: 28px;
		right: 25px;
		width: 394px;
		height: 328px;
		padding: var(--space-xl) var(--space-lg);
		border-radius: 10px;
		background-color: rgb(0 0 0 / 0.62);
		opacity: 0;
		visibility: hidden;
		transform: scale(0.96);
		transform-origin: top right;
		transition:
			opacity var(--duration) var(--ease-out),
			transform var(--duration) var(--ease-out),
			visibility 0s linear var(--duration);
	}

	.menu.open {
		opacity: 1;
		visibility: visible;
		transform: none;
		transition-delay: 0s;
	}

	.menu a {
		font-size: var(--text-xl);
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--color-white);
		transition: color var(--duration) var(--ease-out);
	}

	.menu a:hover,
	.menu a:focus-visible {
		color: var(--color-accent);
	}

	.sticker {
		position: absolute;
		right: var(--space-sm);
		bottom: 0;
		width: 96px;
		height: 148px;
		object-fit: cover;
	}
</style>
