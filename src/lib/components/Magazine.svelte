<!--
  The portfolio magazine: an open magazine showing one spread. Each spread is a
  single landscape image of both pages; the left page shows its left half and
  the right page its right half. Printed-paper look: drop shadow, fold down the
  middle, slight page curvature and paper edges. Without spreads it shows blank pages.
-->

<script>
	import { fade } from 'svelte/transition';

	// index: the spread that's open (bindable, the page keeps it in the URL).
	// canPrev / canNext tell the page which arrows to show.
	let {
		spreads,
		index = $bindable(0),
		canPrev = $bindable(false),
		canNext = $bindable(false)
	} = $props();

	const note = $derived(spreads[index]?.note);

	$effect(() => {
		canPrev = index > 0;
		canNext = index < spreads.length - 1;
	});

	// Go one spread forward (1) or back (-1). Returns false if there's nowhere to go.
	export function turn(direction) {
		const target = index + direction;
		if (target < 0 || target >= spreads.length) return false;
		index = target;
		return true;
	}

	// Background for one page: the spread image, sized so each page shows its own half
	function pageImage(i) {
		const url = spreads[i]?.image_url;
		return url ? `url("${url}")` : 'none';
	}
</script>

<div class="magazine">
	<div class="page left" style:background-image={pageImage(index)}></div>
	<div class="page right" style:background-image={pageImage(index)}></div>
	<div class="fold" aria-hidden="true"></div>

	{#key index}
		{#if note}
			<p class="note" in:fade={{ duration: 300, delay: 150 }} out:fade={{ duration: 150 }}>
				{note}
			</p>
		{/if}
	{/key}
</div>

<style>
	/* Paper colour for blank pages and the page edges (no token for it) */
	.magazine {
		--paper: #f4f1ea;
		--paper-edge: #d8d3c8;
		position: relative;
		width: 100%;
		height: 100%;
		/* Two soft shadows under the magazine, then 1–2px paper edges on the
		   outer sides so it reads as a stack of pages */
		box-shadow:
			0 12px 24px rgb(0 0 0 / 0.35),
			0 28px 60px rgb(0 0 0 / 0.18),
			-2px 0 0 var(--paper),
			2px 0 0 var(--paper),
			-3px 1px 0 var(--paper-edge),
			3px 1px 0 var(--paper-edge);
	}

	/* Each page shows half of the spread image: the image is twice the page's
	   width, pinned left for the left page and right for the right page */
	.page {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 50%;
		background-color: var(--paper);
		background-size: 200% 100%;
		background-repeat: no-repeat;
	}

	.page.left {
		left: 0;
		background-position: left center;
	}

	.page.right {
		right: 0;
		background-position: right center;
	}

	/* Page curvature: a page gets darker towards the spine and catches a little
	   light near its outer edge */
	.page::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.page.left::after {
		background: linear-gradient(
			to right,
			rgb(255 255 255 / 0.07),
			transparent 22%,
			transparent 78%,
			rgb(0 0 0 / 0.12) 93%,
			rgb(0 0 0 / 0.22)
		);
	}

	.page.right::after {
		background: linear-gradient(
			to left,
			rgb(255 255 255 / 0.07),
			transparent 22%,
			transparent 78%,
			rgb(0 0 0 / 0.12) 93%,
			rgb(0 0 0 / 0.22)
		);
	}

	/* The crease down the middle, darkest at the spine */
	.fold {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 46%;
		width: 8%;
		background: linear-gradient(
			to right,
			transparent,
			rgb(0 0 0 / 0.15) 35%,
			rgb(0 0 0 / 0.45) 50%,
			rgb(0 0 0 / 0.15) 65%,
			transparent
		);
		pointer-events: none;
	}

	/* Small red note at the top-left of the left page (max two lines) */
	.note {
		position: absolute;
		top: 25px;
		left: 40px;
		max-width: 40%;
		font-family: var(--font-body);
		font-size: var(--text-body);
		line-height: 21px;
		letter-spacing: 1.12px;
		text-transform: uppercase;
		color: var(--color-accent);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
