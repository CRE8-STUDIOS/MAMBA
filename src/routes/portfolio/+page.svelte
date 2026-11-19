<!--
  Portfolio page: a magazine you flip through. Shows one spread at a time with
  arrows on either side and the spread's caption under the right page.
  Content: portfolio_spreads table, ordered by sort_order.
-->

<script>
	import { fade } from 'svelte/transition';
	import Magazine from '#lib/components/Magazine.svelte';
	import ArrowButton from '#lib/components/ArrowButton.svelte';

	let { data } = $props();

	let magazine = $state();
	let index = $state(0);
	let canPrev = $state(false);
	let canNext = $state(false);

	const spread = $derived(data.spreads[index]);
</script>

<h1 class="title font-graffiti">Portfolio</h1>

<section class="viewer" aria-label="Portfolio magazine">
	<div class="book">
		<Magazine bind:this={magazine} spreads={data.spreads} bind:index bind:canPrev bind:canNext />
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
					{spread.caption}
				</p>
			{/if}
		{/key}
	</div>

	{#if data.spreads.length}
		<div class="arrows">
			<ArrowButton
				direction="left"
				label="Previous page"
				hidden={!canPrev}
				onclick={() => magazine.turn(-1)}
			/>
			<ArrowButton
				direction="right"
				label="Next page"
				hidden={!canNext}
				onclick={() => magazine.turn(1)}
			/>
		</div>
	{/if}
</section>

<style>
	/* Right under the centred MAMBA logo (top 63px in Figma) */
	.title {
		font-size: var(--text-xl);
		color: var(--color-accent);
		text-align: center;
	}

	/* Magazine size: 1094 × 726 in Figma, scaled down on smaller screens while
	   leaving room for the arrows (2 × (49px gap + 62px arrow + 16px air)). */
	.viewer {
		--book-w: min(1094px, 85vw, 100vw - 254px);
		--book-h: calc(var(--book-w) * 726 / 1094);
		/* flow-root keeps the magazine's top margin inside, so the arrows'
		   position below lines up with it */
		display: flow-root;
		position: relative;
		padding-bottom: var(--space-lg);
	}

	/* 39px puts the magazine's top at ~150px, as in Figma */
	.book {
		width: var(--book-w);
		height: var(--book-h);
		margin: 39px auto 0;
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
		top: calc(39px + var(--book-h) / 2);
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
</style>
