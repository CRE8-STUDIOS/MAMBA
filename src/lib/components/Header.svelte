<!--
  Site header shown on every page: MAMBA logo, a two-line menu button and the
  main navigation (Digitals, Portfolio, Work).
-->

<script>
	import { afterNavigate } from '$app/navigation';

	// Whether the menu is open. The button toggles it.
	let isOpen = $state(false);

	function toggleMenu() {
		isOpen = !isOpen;
	}

	// Close the menu after moving to another page, so it isn't still open there.
	afterNavigate(() => {
		isOpen = false;
	});
</script>

<header class="header" class:is-open={isOpen}>
	<a class="logo font-display" href="/">MAMBA</a>

	<!-- Two lines drawn with spans; aria-expanded tells screen readers the menu state -->
	<button
		class="menu-button"
		type="button"
		aria-expanded={isOpen}
		aria-controls="main-nav"
		onclick={toggleMenu}
	>
		<span class="visually-hidden">{isOpen ? 'Close menu' : 'Open menu'}</span>
		<span class="line"></span>
		<span class="line"></span>
	</button>

	<nav id="main-nav" class="nav" hidden={!isOpen}>
		<ul>
			<li><a href="/digitals">Digitals</a></li>
			<li><a href="/portfolio">Portfolio</a></li>
			<li><a href="/work">Work</a></li>
		</ul>
	</nav>
</header>

<style>
	/* Bare minimum so the menu button is visible and clickable — full design comes later */
	.menu-button {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		width: 44px;
		height: 44px;
	}

	/* The two lines of the menu icon */
	.line {
		display: block;
		width: 28px;
		height: 2px;
		background-color: currentColor;
	}
</style>
