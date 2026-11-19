<!--
  Portfolio page: a magazine you flip through. Shows one spread at a time with
  arrows on either side and the spread's caption under the right page.
  Content: portfolio_spreads table, ordered by sort_order.
-->

<script>
	import { fade } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Magazine from '#lib/components/Magazine.svelte';
	import ArrowButton from '#lib/components/ArrowButton.svelte';

	let { data } = $props();

	let magazine = $state();
	// Opens on the spread from ?page= (worked out in +page.server.js)
	let index = $state(untrack(() => data.start));
	let canPrev = $state(false);
	let canNext = $state(false);
	let peel = $state(null);
	let arrows = $state({});

	const spread = $derived(data.spreads[index]);

	// Keep ?page= in the address bar in step with the open spread, so the link
	// can be shared. Shallow + replace: only the URL changes, without a new
	// history entry per page turn. Only `index` is tracked; reading the URL and
	// page state inside untrack keeps this from re-running itself in a loop.
	$effect(() => {
		const search = index > 0 ? `?page=${index + 1}` : '';
		untrack(() => {
			if (location.search === search) return;
			goto(location.pathname + search, { shallow: true, replace: true, state: page.state });
		});
	});

	// Turn the page from an arrow. Focus stays on that arrow; if it has just
	// disappeared (first or last spread), it moves to the other one.
	// Arrow keys turn the page, unless someone is typing somewhere
	function onKeydown(event) {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
		if (event.key === 'ArrowRight') magazine.turn(1);
		if (event.key === 'ArrowLeft') magazine.turn(-1);
	}

	async function turnFrom(dir) {
		const [own, other] = dir === 1 ? [arrows.next, arrows.prev] : [arrows.prev, arrows.next];
		const hadFocus = document.activeElement === own;
		await magazine.turn(dir);
		const ownGone = dir === 1 ? !canNext : !canPrev;
		if (hadFocus && ownGone) other?.focus();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<h1 class="title font-graffiti">Portfolio</h1>

<section class="viewer" aria-label="Portfolio magazine">
	<div class="book">
		<Magazine
			bind:this={magazine}
			spreads={data.spreads}
			bind:index
			bind:canPrev
			bind:canNext
			{peel}
		/>
	</div>

	<!-- Caption under the right page; fades when the spread changes -->
	<div class="caption">
		{#key index}
			{#if spread?.caption}
				<p
					class="font-graffiti"
					in:fade={{ duration: 300, delay: 150 }}
					out:fade={{ duration: 150 }}
				>
					<!-- Links to the project when the spread belongs to one -->
					{#if spread.href}
						<a href={spread.href}>{spread.caption}</a>
					{:else}
						{spread.caption}
					{/if}
				</p>
			{/if}
		{/key}
	</div>

	{#if data.spreads.length}
		<div class="arrows">
			<!-- Hovering or focusing an arrow lifts the matching page corner -->
			<ArrowButton
				bind:element={arrows.prev}
				direction="left"
				label="Previous page"
				hidden={!canPrev}
				onclick={() => turnFrom(-1)}
				onpointerenter={() => (peel = 'left')}
				onpointerleave={() => (peel = null)}
				onfocus={() => (peel = 'left')}
				onblur={() => (peel = null)}
			/>
			<ArrowButton
				bind:element={arrows.next}
				direction="right"
				label="Next page"
				hidden={!canNext}
				onclick={() => turnFrom(1)}
				onpointerenter={() => (peel = 'right')}
				onpointerleave={() => (peel = null)}
				onfocus={() => (peel = 'right')}
				onblur={() => (peel = null)}
			/>
		</div>
	{/if}
</section>

<style>
	/* The page fills exactly one screen, no scrolling. Fixed space above the
	   magazine (logo + title + gap) and below it (caption + gap), the rest is
	   the magazine. */
	.title {
		font-size: var(--text-md);
		color: var(--color-accent);
		text-align: center;
	}

	/* Magazine size: 1094 × 726 in Figma. It shrinks to fit both the width
	   (leaving room for the arrows: 2 × (49px gap + 62px arrow + 16px air)) and
	   the height left over between the titles and the caption. */
	.viewer {
		--gap: var(--space-md);
		--top-space: 104px; /* logo 20 + 28, title 32, gap 24 */
		--bottom-space: 80px; /* gap 10, caption ~44, bottom 26 */
		--book-w: min(
			1094px,
			85vw,
			100vw - 254px,
			(100svh - var(--top-space) - var(--bottom-space)) * 1094 / 726
		);
		--book-h: calc(var(--book-w) * 726 / 1094);
		/* flow-root keeps the magazine's top margin inside, so the arrows'
		   position below lines up with it */
		display: flow-root;
		position: relative;
	}

	.book {
		width: var(--book-w);
		height: var(--book-h);
		margin: var(--gap) auto 0;
	}

	/* Caption: right-aligned with the right page, ~10px under the magazine.
	   36px graffiti, the same size as the logo token. The grid stacks the old
	   and new caption while they cross-fade. */
	.caption {
		display: grid;
		justify-items: end;
		width: var(--book-w);
		min-height: calc(var(--text-logo) * 1.2);
		margin: 10px auto 0;
	}

	.caption a:hover,
	.caption a:focus-visible {
		text-decoration: underline;
	}

	.caption p {
		grid-area: 1 / 1;
		font-size: var(--text-logo);
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	/* Arrows 49px from the screen edges, centred on the magazine's height */
	.arrows {
		position: absolute;
		top: calc(var(--gap) + var(--book-h) / 2);
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding-inline: 49px;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.arrows > :global(button) {
		pointer-events: auto;
	}

	/* Phones and portrait tablets: one page at a time (547 × 726 in Figma), with
	   the caption and then the two arrows side by side underneath */
	@media (max-width: 768px) {
		.viewer {
			--top-space: 100px;
			--bottom-space: 150px; /* gap, caption, arrows row, bottom */
			--book-w: min(
				547px,
				100vw - 2 * var(--space-sm),
				(100svh - var(--top-space) - var(--bottom-space)) * 547 / 726
			);
			--book-h: calc(var(--book-w) * 726 / 547);
		}

		.caption {
			justify-items: center;
		}

		.arrows {
			position: static;
			justify-content: center;
			gap: var(--space-sm);
			padding: 0;
			margin-top: var(--space-xs);
			transform: none;
		}
	}
</style>
