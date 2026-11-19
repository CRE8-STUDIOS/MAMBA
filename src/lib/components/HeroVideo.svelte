<!--
  Full-screen hero for the home page: video (or poster) inside a frame with a
  10px border, a dark overlay with an inner shadow, the glass MAMBA title and a
  sound toggle. With no video or poster it still renders as a grey frame with the title.
-->

<script>
	import { onMount } from 'svelte';

	let { src, poster } = $props();

	let video = $state();
	// Mirrors video.muted via volumechange; a video starts unmuted
	let muted = $state(false);
	let paused = $state(true);

	// Removes the "first interaction turns sound on" listeners (and on unmount)
	const unlock = new AbortController();

	onMount(() => {
		// Reduced motion: no autoplay, the poster stays with a play button instead
		if (video && !matchMedia('(prefers-reduced-motion: reduce)').matches) playWithSound();
		return () => unlock.abort();
	});

	// Browsers usually block autoplay with sound. Try it first; if it's blocked,
	// play muted and turn the sound on with the visitor's first click or keypress.
	async function playWithSound() {
		// Local copy: if the page is left while play() is pending, Svelte sets
		// `video` to null before the catch below runs.
		const el = video;
		el.muted = false;
		try {
			await el.play();
		} catch {
			if (unlock.signal.aborted) return; // component is already gone
			el.muted = true;
			el.play().catch(() => {});
			const unmute = () => {
				el.muted = false;
				unlock.abort();
			};
			addEventListener('click', unmute, { signal: unlock.signal });
			addEventListener('keydown', unmute, { signal: unlock.signal });
		}
	}

	// The corner button plays the video if it isn't playing yet (reduced motion),
	// otherwise it toggles the sound.
	function onButtonClick() {
		if (paused) {
			video.muted = false;
			video.play();
		} else {
			video.muted = !video.muted;
		}
	}
</script>

<section class="hero">
	<div class="frame">
		{#if src}
			<video
				bind:this={video}
				bind:paused
				onvolumechange={() => (muted = video.muted)}
				{src}
				{poster}
				loop
				playsinline
			></video>
		{:else if poster}
			<img src={poster} alt="" />
		{/if}

		<div class="overlay"></div>

		<h1 class="title">mamba</h1>
	</div>

	{#if src}
		<button
			class="sound"
			type="button"
			aria-label={paused ? 'Play video' : muted ? 'Turn sound on' : 'Turn sound off'}
			onclick={onButtonClick}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if paused}
					<path d="M8 5v14l11-7z" fill="currentColor" />
				{:else}
					<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
					{#if muted}
						<path d="M16 9l6 6m0-6l-6 6" />
					{:else}
						<path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />
					{/if}
				{/if}
			</svg>
		</button>
	{/if}
</section>

<style>
	/* 10px gap around the frame — no spacing token is this small */
	.hero {
		position: relative;
		height: 100svh;
		padding: 10px;
	}

	.frame {
		position: relative;
		height: 100%;
		overflow: hidden;
		border-radius: 2px;
	}

	video,
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Dark tint + inner shadow from the Figma frame. The shadow sits on the
	   overlay because an inset shadow on .frame would be hidden behind the video. */
	.overlay {
		position: absolute;
		inset: 0;
		background-color: rgb(0 0 0 / 0.3);
		box-shadow: inset 0 4px 4px rgb(0 0 0 / 0.25);
	}

	/* Black glass title: a see-through black fill (a background clipped to the
	   letters), a faint white rim so the glass edge stays visible on a dark video,
	   and the Figma black shadow drawn over the fill as an inner shadow at the top
	   of each letter. */
	.title {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--font-display);
		/* The token's 64px minimum is still too wide for a 375px phone ("MAMBA" is
		   ~5.7em wide), so cap it at 15vw to keep the word inside the frame */
		font-size: min(var(--text-3xl), 15vw);
		color: transparent;
		background-color: rgb(0 0 0 / 0.55);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-stroke: 1px rgb(255 255 255 / 0.25);
		text-shadow: 0 4px 4px rgb(0 0 0 / 0.25);
		pointer-events: none;
	}

	/* 44px keeps it an easy tap target; it sits 24px from the screen edges */
	.sound {
		position: absolute;
		right: var(--space-md);
		bottom: var(--space-md);
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--color-white);
	}

	.sound svg {
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
