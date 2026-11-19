<!--
  The portfolio magazine: an open magazine showing one spread. Each spread is a
  single landscape image of both pages; the left page shows its left half and
  the right page its right half, so one image is enough for a real page turn.
  Printed-paper look: drop shadow, fold down the middle, slight page curvature
  and paper edges. On narrow screens (≤768px) it shows one page at a time.
  Without spreads it shows blank pages.
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
	const BEND = 22; // extra degrees at the free edge, mid-turn (0 at start and end): a gentle bend

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

	// ---- One page at a time on narrow screens ----
	// Pages run spread 1 left, spread 1 right, spread 2 left, … ; `side` is
	// which half of the current spread is showing (0 left, 1 right).
	let single = $state(false);
	let side = $state(0);
	$effect(() => {
		const query = matchMedia('(max-width: 768px)');
		const update = () => (single = query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});
	const pos = $derived(index * 2 + side); // page number in single view

	$effect(() => {
		canPrev = single ? pos > 0 : index > 0;
		canNext = single ? pos < spreads.length * 2 - 1 : index < spreads.length - 1;
	});

	// While a page turns, what's on the turning sheet:
	//   hinge: 1 = hinged on its left edge (turns to the left), -1 = on its right edge
	//   front / back: { spread, half } shown on each side of the sheet (back may be blank)
	//   reverse: the sheet comes back instead of going over (single view, previous page)
	//   dir: which way we're moving through the magazine
	// For reduced motion it holds { fadeFrom: { spread, half } } instead.
	let turning = $state(null);

	const note = $derived(turning || (single && side === 1) ? null : spreads[index]?.note);

	// What the resting pages show. While turning, the page under the sheet
	// already shows where we're going.
	const leftSpread = $derived(turning?.dir === -1 && !single ? index - 1 : index);
	const rightSpread = $derived(turning?.dir === 1 && !single ? index + 1 : index);
	const singlePage = $derived.by(() => {
		if (turning?.dir === 1) return pageAt(pos + 1); // next page waits underneath
		return pageAt(pos);
	});

	function pageAt(p) {
		return { spread: Math.floor(p / 2), half: p % 2 };
	}

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
	// The image is two pages wide; strips count outwards from the hinge. The back
	// is seen through the turned-over paper, so its slices run the other way.
	function slice(i, face) {
		const { w } = page;
		const s = w / STRIPS;
		const { half } = turning[face];
		const fromHinge = (turning.hinge === 1) === (face === 'front');
		const inPage = fromHinge ? i * s : w - (i + 1) * s;
		return `${-(half * w + inPage)}px 0`;
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

	// Draws the turn at progress p (0 = start, 1 = done). Only transforms and
	// opacity, so it stays smooth.
	function setProgress(p) {
		const { hinge, reverse } = turning;
		const q = reverse ? 1 - p : p; // how far over the sheet is
		const bend = Math.sin(Math.PI * q); // 0 flat, 1 halfway
		const base = hinge * -180 * q; // the hinge side of the sheet
		const step = (hinge * -BEND * bend) / STRIPS; // each strip a bit further

		let angle = base;
		for (let i = 0; i < STRIPS; i++) {
			// Strip 0 hangs on the hinge; every next strip on the previous one
			strips[i].style.transform = `rotateY(${i === 0 ? base + step : step}deg)`;
			angle += step;
			// Paper gets darker the more it stands up (both sides)
			const shade = String(Math.abs(Math.sin((angle * Math.PI) / 180)) * 0.45);
			shades[i].style.opacity = shade;
			backShades[i].style.opacity = shade;
		}

		// Shadow of the lifting sheet on the page it uncovers (fades as it lifts
		// away) and on the page it is about to land on (just before landing)
		const uncovered = hinge === 1 ? shadows.right : shadows.left;
		const landing = hinge === 1 ? shadows.left : shadows.right;
		if (uncovered) {
			uncovered.style.opacity = String((1 - q) * Math.min(1, q * 6) * 0.8);
			uncovered.style.transform = `scaleX(${1 - q * 0.7})`;
		}
		if (landing) {
			landing.style.opacity = String(q > 0.5 ? Math.min(1, (q - 0.5) * 6) * (1 - q) * 1.4 : 0);
		}
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

	function allowed(dir) {
		if (single) return pos + dir >= 0 && pos + dir < spreads.length * 2;
		return index + dir >= 0 && index + dir < spreads.length;
	}

	// Step through the magazine: a page in single view, a spread otherwise
	function move(dir) {
		if (single) {
			const next = pageAt(pos + dir);
			index = next.spread;
			side = next.half;
		} else {
			index += dir;
		}
	}

	// What goes on the turning sheet for a step in direction `dir`
	function sheetFor(dir) {
		if (single) {
			// Forward: the current page turns away to the left, its back blank.
			// Back: the previous page comes back over the current one.
			const front = pageAt(dir === 1 ? pos : pos - 1);
			return { dir, hinge: 1, front, back: { spread: -1, half: 0 }, reverse: dir === -1 };
		}
		return {
			dir,
			hinge: dir,
			front: { spread: index, half: dir === 1 ? 1 : 0 },
			back: { spread: index + dir, half: dir === 1 ? 0 : 1 },
			reverse: false
		};
	}

	// ---- Turning, in three steps shared by the arrows and dragging ----

	// 1. Put the sheet in place, ready to turn
	async function begin(dir) {
		busy = true;
		const width = single ? magazine.clientWidth : magazine.clientWidth / 2;
		page = { w: width, h: magazine.clientHeight };
		turning = sheetFor(dir);
		await tick();
	}

	// 2. Let it go all the way (to = 1) or fall back (to = 0) from where it is
	async function settle(from, to) {
		const { dir } = turning;
		try {
			const duration = Math.max(200, TURN_MS * Math.abs(to - from));
			await animate(from, to, duration, setProgress);
			if (!destroyed && to === 1) move(dir);
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

	// Reduced motion: no 3D, show the new page(s) and fade the old ones out on top
	async function crossfade(dir) {
		busy = true;
		try {
			turning = { fadeFrom: single ? pageAt(pos) : { spread: index, half: -1 } };
			move(dir);
			await tick();
			await animate(1, 0, FADE_MS, (o) => (ghost.style.opacity = String(o)));
		} finally {
			end();
		}
	}

	// Go one step forward (1) or back (-1). Ignored while a page is turning.
	// Resolves to false if there was nowhere to go.
	export async function turn(dir) {
		if (busy || !allowed(dir)) return false;
		if (reducedMotion()) {
			await crossfade(dir);
		} else {
			await begin(dir);
			await settle(0, 1);
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
			setProgress(drag.progress);
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
			await settle(progress, progress > FINISH_AT ? 1 : 0);
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
	class:single
	bind:this={magazine}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	{#if single}
		<!-- One page: styled as a right page (hinged on its left edge) -->
		<div
			class="page right whole"
			style:background-image={pageImage(singlePage.spread)}
			style:background-position={singlePage.half ? 'right center' : 'left center'}
		>
			<span class="shadow" bind:this={shadows.right}></span>
			<span class="corner" class:peeled={peel === 'right' && !turning}></span>
		</div>
	{:else}
		<div class="page left" style:background-image={pageImage(leftSpread)}>
			<span class="shadow" bind:this={shadows.left}></span>
			<span class="corner" class:peeled={peel === 'left' && !turning}></span>
		</div>
		<div class="page right" style:background-image={pageImage(rightSpread)}>
			<span class="shadow" bind:this={shadows.right}></span>
			<span class="corner" class:peeled={peel === 'right' && !turning}></span>
		</div>
		<div class="fold" aria-hidden="true"></div>
	{/if}

	<!-- The page being turned. It may lift out over the magazine's edges, like
	     a real page. -->
	{#if turning?.dir}
		<div
			class="turner"
			class:forward={turning.hinge === 1}
			class:backward={turning.hinge === -1}
			style:--front={pageImage(turning.front.spread)}
			style:--back={pageImage(turning.back.spread)}
			style:--size="{page.w * 2}px {page.h}px"
			aria-hidden="true"
		>
			{@render strip(0)}
		</div>
	{/if}

	<!-- Reduced motion: the old page(s) fading out over the new ones -->
	{#if turning?.fadeFrom}
		{@const from = turning.fadeFrom}
		<div bind:this={ghost} class="ghost">
			{#if single}
				<div
					class="page right whole"
					style:background-image={pageImage(from.spread)}
					style:background-position={from.half ? 'right center' : 'left center'}
				></div>
			{:else}
				<div class="page left" style:background-image={pageImage(from.spread)}></div>
				<div class="page right" style:background-image={pageImage(from.spread)}></div>
			{/if}
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
		perspective: 3000px;
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

	/* Single view: one page over the full width (still half of the image) */
	.page.whole {
		width: 100%;
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

	/* Single view: the sheet covers the one page */
	.single .turner {
		left: 0;
		width: 100%;
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
