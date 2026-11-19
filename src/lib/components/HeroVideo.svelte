<!--
  Full-screen hero for the home page: video (or poster) inside a frame with a
  10px border, a dark overlay with an inner shadow, and the glass MAMBA title.
  With no video or poster it still renders as a grey frame with the title.
-->

<script>
	let { src, poster } = $props();
</script>

<section class="hero">
	<div class="frame">
		{#if src}
			<video {src} {poster} autoplay muted loop playsinline></video>
		{:else if poster}
			<img src={poster} alt="" />
		{/if}

		<div class="overlay"></div>

		<h1 class="title">mamba</h1>
	</div>
</section>

<style>
	/* 10px gap around the frame — no spacing token is this small */
	.hero {
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

	/* Glass title: the white fill is a background clipped to the letters, and the
	   text-shadow drawn over that fill reads as an inner shadow at the top of each letter. */
	.title {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		color: transparent;
		background-color: rgb(255 255 255 / 0.4);
		background-clip: text;
		-webkit-background-clip: text;
		text-shadow: 0 4px 4px rgb(0 0 0 / 0.25);
		pointer-events: none;
	}
</style>
