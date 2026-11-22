yes<!--
  Site header on every page: MAMBA logo, the scribble menu button and the menu
  card (Digitals, Portfolio, Work). On the home page it floats over the
  hero in white without the logo; everywhere else it's black in the normal page flow.
-->

<script>
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { paintMenu } from '#lib/spray.js';

	let { menuCharacter } = $props();

	let isOpen = $state(false);
	let button = $state();
	let menu = $state();
	let canvas = $state();
	let links = $state([]);
	let painter = $state();

	const navItems = [
		{ href: '/digitals', label: 'Digitals' },
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/work', label: 'Work' }
	];

	const isHome = $derived(page.route.id === '/');

	// Close the menu after moving to another page, so it isn't still open there.
	afterNavigate(() => {
		isOpen = false;
	});

	// Spray the menu words each time the menu opens. The cleanup cancels a
	// running animation when it closes, so nothing runs while it's closed.
	$effect(() => {
		if (!isOpen) return;
		return paintMenu({
			canvas,
			card: menu,
			links,
			painter,
			reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
		});
	});

	// Escape closes the menu and puts focus back on the button.
	function onKeydown(event) {
		if (isOpen && event.key === 'Escape') {
			isOpen = false;
			button.focus();
		}
	}

	// A click anywhere outside the card and the button closes the menu.
	// composedPath() is the list of elements the click passed through.
	function onWindowClick(event) {
		const path = event.composedPath();
		if (isOpen && !path.includes(menu) && !path.includes(button)) {
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} onclick={onWindowClick} />

<header class:home={isHome}>
	<!-- No logo on the home page: the big hero title already says MAMBA -->
	{#if !isHome}
		<a class="logo font-display" href="/">MAMBA</a>
	{/if}

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
		<!-- All three lines stay in place; CSS sprays them on and off (see .icon) -->
		<span class="icon burger"></span>
		<span class="icon close close-1"></span>
		<span class="icon close close-2"></span>
	</button>

	<nav bind:this={menu} id="main-nav" class="menu" class:open={isOpen}>
		<!-- Paint drips under the words, drawn by paintMenu() in #lib/spray.js -->
		<canvas bind:this={canvas} class="paint" aria-hidden="true"></canvas>

		<!-- Real links from the start; only the way they appear is animated -->
		<ul>
			{#each navItems as item, i (item.href)}
				<li><a bind:this={links[i]} class="font-graffiti" href={item.href}>{item.label}</a></li>
			{/each}
		</ul>

		<!-- The spray-painting character goes here later. paintMenu() moves this
		     along the nozzle path (getNozzlePath in #lib/spray.js) while the words
		     are sprayed. Image from profile.menu_character_url; empty = nothing. -->
		<div bind:this={painter} class="menu__painter" aria-hidden="true">
			{#if menuCharacter}
				<img src={menuCharacter} alt="" />
			{/if}
		</div>
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

	/* ---- Spray paint mask, shared by the menu words and the menu icon ----
	   --reveal is how far the paint has got, left→right: 0% = nothing, 140% =
	   fully painted (past 100% so the faded edge is gone). It's registered so CSS
	   can transition it (the icon); paintMenu() sets it directly on the words.
	   Three layers: solid paint up to the edge, plus random speckles (an SVG noise
	   pattern) that only show in a band at the edge (speckles ∩ band), which
	   gives the ragged spray edge. Defined on each element so var(--reveal) is
	   that element's own value. */
	@property --reveal {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 140%;
	}

	.menu a,
	.icon {
		--spray-mask:
			linear-gradient(90deg, #000 calc(var(--reveal) - 22%), transparent calc(var(--reveal) - 12%)),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2 0 0 0 -1'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='64' height='64' filter='url(%23n)'/%3E%3C/svg%3E"),
			linear-gradient(
				90deg,
				transparent calc(var(--reveal) - 22%),
				#000 calc(var(--reveal) - 15%),
				transparent var(--reveal)
			);
	}

	/* The SVG files are drawn as masks so they take the text colour (white or black),
	   combined with the spray mask: icon ∩ (paint ∪ (speckles ∩ band)).
	   Sizes match the SVGs, which include a few px of padding for the scribble filter. */
	.icon {
		display: block;
		background-color: currentColor;
		mask-image: var(--icon), var(--spray-mask);
		mask-size:
			100% 100%,
			100% 100%,
			64px 64px,
			100% 100%;
		mask-repeat: no-repeat, no-repeat, repeat, no-repeat;
		mask-composite: intersect, add, intersect;
	}

	/* Open: the hamburger is wiped away, then the X is sprayed on line by line.
	   Close: the X is wiped, then the hamburger sprays back. Each state sets the
	   timing of the transition into it. Visibility switches with the paint, so the
	   inactive icon is really gone even where the spray mask isn't supported.
	   (Fixed ms: no tokens this short.) */
	.burger {
		--icon: url('/icons/menu.svg');
		width: 79px;
		height: 23px;
		transition:
			--reveal 220ms var(--ease-out) 200ms,
			visibility 0s 200ms;
	}

	.toggle.open .burger {
		--reveal: 0%;
		visibility: hidden;
		transition:
			--reveal 220ms var(--ease-out),
			visibility 0s 220ms;
	}

	/* The card is dark on every page, so the X is always white. It sits 24px
	   further in than the hamburger so it has room from the card's corner. */
	.close {
		--reveal: 0%;
		position: absolute;
		top: calc(50% + var(--space-md));
		left: calc(50% - var(--space-md));
		width: 87px;
		height: 13px;
		background-color: var(--color-white);
		visibility: hidden;
		transition:
			--reveal 220ms var(--ease-out),
			visibility 0s 220ms;
	}

	.toggle.open .close {
		--reveal: 140%;
		visibility: visible;
	}

	.toggle.open .close-1 {
		transition:
			--reveal 220ms var(--ease-out) 200ms,
			visibility 0s 200ms;
	}

	.toggle.open .close-2 {
		transition:
			--reveal 220ms var(--ease-out) 320ms,
			visibility 0s 320ms;
	}

	@media (prefers-reduced-motion: reduce) {
		.icon {
			transition: none;
		}
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

	/* Menu card. It appears at once on open (spraying the words is the animation)
	   and fades out in 200ms on close (fixed value: no duration token is this
	   short). Visibility switches after the fade so the links can't be tabbed to
	   while it's closed. */
	.menu {
		position: absolute;
		top: 28px;
		right: 25px;
		width: 394px;
		height: 328px;
		padding: var(--space-xl) var(--space-lg);
		isolation: isolate; /* keeps the ::before background behind the links */
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 200ms var(--ease-out),
			visibility 0s linear 200ms;
	}

	.menu.open {
		opacity: 1;
		visibility: visible;
		transition: none;
	}

	/* The card itself, as a background layer so its rough edge never clips the
	   words or (later) the painter character.
	   Textured glass: the page behind is blurred (backdrop-filter), tinted with the
	   Figma black at 0.62, with a fine grain on top (SVG noise).
	   Graffiti edge: the mask is the card shape run through the same "texture"
	   filter as the Figma menu icons (noise displacement, scale 8), so the border
	   is rough like the scribble lines instead of a clean rounded rectangle. */
	.menu::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background-color: rgb(0 0 0 / 0.62);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)'/%3E%3C/svg%3E");
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='394' height='328' viewBox='0 0 394 328' preserveAspectRatio='none'%3E%3Cfilter id='t' x='-5%25' y='-5%25' width='110%25' height='110%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.25' numOctaves='3' seed='5633'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='8' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3Crect x='5' y='5' width='384' height='318' rx='10' filter='url(%23t)'/%3E%3C/svg%3E")
			no-repeat 0 0 / 100% 100%;
	}

	/* Covers the card; paintMenu() sets its pixel size for sharp retina drawing */
	.paint {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	/* Keep the links above the canvas */
	.menu ul {
		position: relative;
	}

	/* Words use the spray mask; paintMenu() moves --reveal behind the nozzle.
	   Without JS it stays at 140%, so the word is simply visible. */
	.menu a {
		display: inline-block;
		font-size: var(--text-xl);
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--color-white);
		mask-image: var(--spray-mask);
		mask-size:
			100% 100%,
			64px 64px,
			100% 100%;
		mask-composite: add, intersect;
		transition: color var(--duration) var(--ease-out);
	}

	.menu a:hover,
	.menu a:focus-visible {
		color: var(--color-accent);
	}

	/* Placeholder for the painter: a point at the nozzle (moved with transform by
	   paintMenu). The character image is centred on that point for now. */
	.menu__painter {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.menu__painter img {
		transform: translate(-50%, -50%);
	}

	/* Phones: the card becomes a full-screen menu */
	@media (max-width: 600px) {
		.menu {
			position: fixed;
			inset: 0;
			width: auto;
			height: auto;
		}

		/* Full screen: no rough edge, the screen edge is the border */
		.menu::before {
			mask: none;
		}

		.menu a {
			font-size: var(--text-2xl);
		}
	}
</style>
