<!--
  The portfolio magazine: an open magazine showing one spread. Each spread is a
  single landscape image of both pages; the left page shows its left half and
  the right page its right half, so one image is enough for a real page turn.
  Printed-paper look: drop shadow, fold down the middle, slight page curvature
  and paper edges. Without spreads it shows blank pages.
-->

<script>
	import { tick, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';

	// index: the spread that's open (bindable, the page keeps it in the URL).
	// canPrev / canNext tell the page which arrows to show.
	// peel: 'left' / 'right' lifts that page's bottom corner (arrow hover).
	let {
		spreads,
		index = $bindable(0),
		canPrev = $bindable(false),
		canNext = $bindable(false),
		peel = null
	} = $props();

	const TURN_MS = 900;
	const FADE_MS = 250; // reduced motion: crossfade instead of a turn

	// The turning page is a chain of thin vertical strips. Each strip turns a
	// little further than the one before, so the paper bends like a magazine
	// page while it goes over, instead of moving like a stiff board.
	const STRIPS = 10;
	const BEND = 35; // extra degrees at the free edge, mid-turn (0 at start and end)

	// While a page turns: { dir: 1 (next) | -1 (previous) }. For reduced motion
	// { fadeFrom } holds the spread that fades out on top of the new one.
	let turning = $state(null);
	let busy = false;
	let destroyed = false;
	onDestroy(() => (destroyed = true));

	let magazine = $state();
	let strips = $state([]);
	let shades = $state([]);
	let backShades = $state([]);
	let shadows = $state({});
	let ghost = $state();
	let page = $state({ w: 0, h: 0 }); // one page in px, measured when a turn starts

	const note = $derived(turning ? null : spreads[index]?.note);

	$effect(() => {
		canPrev = index > 0;
		canNext = index < spreads.length - 1;
	});

	// Which spread each base page shows. While turning, the page under the
	// turning sheet already shows the target spread.
	const leftSpread = $derived(turning?.dir === -1 ? index - 1 : index);
	const rightSpread = $derived(turning?.dir === 1 ? index + 1 : index);

	// The neighbours, preloaded so a turn never shows an empty page
	const preload = $derived(
		[index - 1, index + 1].map((i) => spreads[i]?.image_url).filter(Boolean)
	);

	// Background for a page: the spread image, sized so each page shows its own half
	function pageImage(i) {
		const url = spreads[i]?.image_url;
		return url ? `url("${url}")` : 'none';
	}

	// Which slice of the spread image a strip shows, as a background offset in px.
	// The image is two pages wide. Strips count outwards from the spine.
	// Turning forward, the front is the right page and the back becomes the next
	// spread's left page; turning back it's the other way round. The back is
	// seen through the turned-over paper, so its slices run the other way.
	function slice(i, side) {
		const { w } = page;
		const s = w / STRIPS;
		const showsRightHalf = (turning.dir === 1) === (side === 'front');
		const fromLeft = showsRightHalf ? w + i * s : w - (i + 1) * s;
		return `${-fromLeft}px 0`;
	}

	// The page-turn easing from the design, cubic-bezier(0.645, 0.045, 0.355, 1),
	// solved for t with a few Newton steps (accurate enough for animation)
	function ease(x) {
		const [x1, y1, x2, y2] = [0.645, 0.045, 0.355, 1];
		const bez = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
		const slope = (t, a, b) =>
			3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t ** 2;
		let t = x;
		for (let i = 0; i < 6; i++) t -= (bez(t, x1, x2) - x) / (slope(t, x1, x2) || 1);
		return bez(Math.min(1, Math.max(0, t)), y1, y2);
	}

	// Draws the turn at progress p (0 = flat on its own side, 1 = landed on the
	// other side). Only transforms and opacity, so it stays smooth.
	function setProgress(p, dir) {
		const bend = Math.sin(Math.PI * p); // 0 at both ends, 1 halfway
		const base = dir * -180 * p; // the spine side of the page
		const step = (dir * -BEND * bend) / STRIPS; // each strip a bit further

		let angle = base;
		for (let i = 0; i < STRIPS; i++) {
			// Strip 0 hangs on the spine; every next strip on the previous one
			strips[i].style.transform = `rotateY(${i === 0 ? base + step : step}deg)`;
			angle += step;
			// Paper gets darker the more it stands up (both sides)
			const shade = String(Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.45);
			shades[i].style.opacity = shade;
			backShades[i].style.opacity = shade;
		}

		// Shadow of the lifting sheet on the page it uncovers (fades as it lifts
		// away) and on the page it is about to land on (just before landing)
		const uncovered = dir === 1 ? shadows.right : shadows.left;
		const landing = dir === 1 ? shadows.left : shadows.right;
		uncovered.style.opacity = String((1 - p) * Math.min(1, p * 6) * 0.8);
		uncovered.style.transform = `scaleX(${1 - p * 0.7})`;
		landing.style.opacity = String(p > 0.5 ? Math.min(1, (p - 0.5) * 6) * (1 - p) * 1.4 : 0);
	}

	// Runs progress from `from` to `to` with the easing: one requestAnimationFrame
	// loop that ends by itself, or when the magazine disappears mid-turn.
	function animate(from, to, duration, draw) {
		return new Promise((resolve) => {
			const start = performance.now();
			const frame = (now) => {
				if (destroyed) return resolve();
				const t = Math.min(1, (now - start) / duration);
				draw(from + (to - from) * ease(t));
				if (t < 1) requestAnimationFrame(frame);
				else resolve();
			};
			requestAnimationFrame(frame);
		});
	}

	const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const allowed = (dir) => index + dir >= 0 && index + dir < spreads.length;

	// ---- Turning, in three steps shared by the arrows and dragging ----

	// 1. Put the sheet in place, ready to turn
	async function begin(dir) {
		busy = true;
		page = { w: magazine.clientWidth / 2, h: magazine.clientHeight };
		turning = { dir };
		await tick();
	}

	// 2. Let it turn over (to = 1) or fall back (to = 0) from where it is
	async function settle(dir, from, to) {
		try {
			const duration = Math.max(200, TURN_MS * Math.abs(to - from));
			await animate(from, to, duration, (p) => setProgress(p, dir));
			if (!destroyed && to === 1) index += dir;
		} finally {
			end(); // never leave a sheet half-turned or the magazine blocked
		}
	}

	// 3. Back to a flat, resting magazine
	function end() {
		if (!destroyed) {
			for (const el of Object.values(shadows)) if (el) el.style.opacity = '0';
			turning = null;
		}
		busy = false;
	}

	// Reduced motion: no 3D, show the new spread and fade the old one out on top
	async function crossfade(dir) {
		busy = true;
		try {
			turning = { fadeFrom: index };
			index += dir;
			await tick();
			await animate(1, 0, FADE_MS, (o) => (ghost.style.opacity = String(o)));
		} finally {
			end();
		}
	}

	// Go one spread forward (1) or back (-1). Ignored while a page is turning.
	// Resolves to false if there was nowhere to go.
	export async function turn(dir) {
		if (busy || !allowed(dir)) return false;
		if (reducedMotion()) {
			await crossfade(dir);
		} else {
			await begin(dir);
			await settle(dir, 0, 1);
		}
		return true;
	}

	// ---- Dragging / swiping ----
	// Grab the magazine and pull sideways: pulling left turns forward, right
	// turns back. The sheet follows the pointer; releasing past 30% of the
	// magazine's width finishes the turn, otherwise it falls back.

	const DRAG_START = 8; // px before a press counts as a drag (so taps stay taps)
	const FINISH_AT = 0.3;
	let drag = null; // { x, id, dir, progress, ready }

	function onPointerDown(event) {
		if (busy || drag || !event.isPrimary || event.button !== 0) return;
		drag = { x: event.clientX, id: event.pointerId, dir: 0, progress: 0, ready: false };
	}

	async function onPointerMove(event) {
		if (!drag || event.pointerId !== drag.id) return;
		const dx = event.clientX - drag.x;

		// Decide the direction once the pointer has moved far enough
		if (!drag.dir) {
			if (Math.abs(dx) < DRAG_START) return;
			const dir = dx < 0 ? 1 : -1;
			if (!allowed(dir)) return (drag = null);
			drag.dir = dir;
			magazine.setPointerCapture(event.pointerId);
			if (reducedMotion()) return; // reduced motion: decide on release only
			await begin(dir);
			if (drag) drag.ready = true;
			else return end(); // released while the sheet was being set up
		}

		if (drag.ready) {
			drag.progress = Math.min(1, Math.max(0, (-drag.dir * dx) / magazine.clientWidth));
			setProgress(drag.progress, drag.dir);
		}
	}

	async function onPointerUp(event) {
		if (!drag || event.pointerId !== drag.id) return;
		const { dir, progress, ready, x } = drag;
		drag = null;
		if (!dir) return;

		if (reducedMotion()) {
			const pulled = Math.abs(event.clientX - x) / magazine.clientWidth;
			if (pulled > FINISH_AT && !busy) await crossfade(dir);
		} else if (ready) {
			await settle(dir, progress, progress > FINISH_AT ? 1 : 0);
		}
	}
</script>

<svelte:head>
	{#each preload as href (href)}
		<link rel="preload" as="image" {href} />
	{/each}
</svelte:head>

<!-- One strip of the turning page, with the next strip nested inside it -->
{#snippet strip(i)}
	<div
		bind:this={strips[i]}
		class="strip"
		style:width="{page.w / STRIPS + 0.6}px"
		style:--offset="{i === 0 ? 0 : page.w / STRIPS}px"
	>
		<div class="face front" style:background-position={slice(i, 'front')}>
			<span class="shade" bind:this={shades[i]}></span>
		</div>
		<div class="face back" style:background-position={slice(i, 'back')}>
			<span class="shade" bind:this={backShades[i]}></span>
		</div>
		{#if i < STRIPS - 1}
			{@render strip(i + 1)}
		{/if}
	</div>
{/snippet}

<div
	class="magazine"
	bind:this={magazine}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<div class="page left" style:background-image={pageImage(leftSpread)}>
		<span class="shadow" bind:this={shadows.left}></span>
		<span class="corner" class:peeled={peel === 'left' && !turning}></span>
	</div>
	<div class="page right" style:background-image={pageImage(rightSpread)}>
		<span class="shadow" bind:this={shadows.right}></span>
		<span class="corner" class:peeled={peel === 'right' && !turning}></span>
	</div>
	<div class="fold" aria-hidden="true"></div>

	<!-- The page being turned, hinged on the spine. Front = the current page,
	     back = the page it becomes on the other side. It may lift out over the
	     magazine's edges, like a real page. -->
	{#if turning?.dir}
		<div
			class="turner"
			class:forward={turning.dir === 1}
			class:backward={turning.dir === -1}
			style:--front={pageImage(index)}
			style:--back={pageImage(index + turning.dir)}
			style:--size="{page.w * 2}px {page.h}px"
			aria-hidden="true"
		>
			{@render strip(0)}
		</div>
	{/if}

	<!-- Reduced motion: the old spread fading out over the new one -->
	{#if turning?.fadeFrom !== undefined}
		<div bind:this={ghost} class="ghost">
			<div class="page left" style:background-image={pageImage(turning.fadeFrom)}></div>
			<div class="page right" style:background-image={pageImage(turning.fadeFrom)}></div>
		</div>
	{/if}

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
		/* Horizontal swipes are ours (page turns); vertical ones still scroll */
		touch-action: pan-y;
		user-select: none;
		cursor: grab;
		/* Depth of the turn: the lifted page comes towards you and may overlap
		   the magazine's edges, without looming over the whole screen */
		perspective: 2400px;
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
		overflow: hidden;
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

	/* Shadow the moving sheet casts on a page below it, darkest at the spine */
	.shadow {
		position: absolute;
		inset: 0;
		z-index: 1;
		opacity: 0;
		pointer-events: none;
	}

	.left .shadow {
		background: linear-gradient(to left, rgb(0 0 0 / 0.55), transparent 70%);
		transform-origin: right center;
	}

	.right .shadow {
		background: linear-gradient(to right, rgb(0 0 0 / 0.55), transparent 70%);
		transform-origin: left center;
	}

	/* ---- Turning page ---- */

	/* Covers the page that turns; the strips hang from the spine */
	.turner {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 2;
		width: 50%;
		transform-style: preserve-3d;
		pointer-events: none;
	}

	.turner.forward {
		left: 50%;
	}

	.turner.backward {
		left: 0;
	}

	/* Each strip sits against the previous one (or the spine) and turns around
	   that shared edge. The extra 0.6px width hides hairline gaps between strips. */
	.strip {
		position: absolute;
		top: 0;
		height: 100%;
		transform-style: preserve-3d;
		will-change: transform;
	}

	.forward .strip {
		left: var(--offset);
		transform-origin: left center;
	}

	.backward .strip {
		right: var(--offset);
		transform-origin: right center;
	}

	/* The two sides of a strip: its slice of the current page in front, its
	   slice of the page-to-be on the back */
	.face {
		position: absolute;
		inset: 0;
		background-color: var(--paper);
		background-size: var(--size);
		background-repeat: no-repeat;
		backface-visibility: hidden;
	}

	.face.front {
		background-image: var(--front);
	}

	.face.back {
		background-image: var(--back);
		transform: rotateY(180deg);
	}

	/* Darkening of the paper as it stands up */
	.shade {
		position: absolute;
		inset: 0;
		background-color: #000;
		opacity: 0;
	}

	/* ---- Corner peel on arrow hover ---- */

	/* The flap is the back of the paper folded over (light, with a crease shadow);
	   the other half shows the page edge underneath. Grows from the corner. */
	.corner {
		position: absolute;
		bottom: 0;
		z-index: 1;
		width: 12%;
		aspect-ratio: 1;
		transform: scale(0);
		transition: transform var(--duration) var(--ease-out);
		pointer-events: none;
	}

	.right .corner {
		right: 0;
		transform-origin: bottom right;
		background: linear-gradient(
			to bottom right,
			transparent 49%,
			var(--paper) 50%,
			#e2dcd0 72%,
			var(--paper-edge)
		);
		filter: drop-shadow(-3px -3px 4px rgb(0 0 0 / 0.25));
	}

	.left .corner {
		left: 0;
		transform-origin: bottom left;
		background: linear-gradient(
			to bottom left,
			transparent 49%,
			var(--paper) 50%,
			#e2dcd0 72%,
			var(--paper-edge)
		);
		filter: drop-shadow(3px -3px 4px rgb(0 0 0 / 0.25));
	}

	.corner.peeled {
		transform: scale(1);
	}

	/* Reduced motion crossfade layer */
	.ghost {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	/* Small red note at the top-left of the left page (max two lines) */
	.note {
		position: absolute;
		top: 25px;
		left: 40px;
		z-index: 3;
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
