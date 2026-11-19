<!--
  Round scribble button with a hand-drawn arrow, used to page through the
  portfolio (and later the Work pages). Black by default; on hover/focus it
  turns red with a small tilt.
-->

<script>
	// element is bindable so a page can move focus to the button.
	// hidden keeps the button's space in the layout but makes it invisible
	// and unfocusable (e.g. no "previous" on the first spread).
	let { direction = 'right', label, hidden = false, element = $bindable(), ...rest } = $props();
</script>

<button
	bind:this={element}
	type="button"
	class="arrow-button {direction}"
	class:gone={hidden}
	aria-label={label}
	{...rest}
>
	<span class="ring"></span>
	<span class="arrow"></span>
</button>

<style>
	/* 62px is the ring's size in Figma */
	.arrow-button {
		position: relative;
		display: grid;
		place-items: center;
		width: 62px;
		height: 62px;
		border-radius: 50%;
		outline-offset: 4px;
		color: var(--color-text);
		transition:
			color var(--duration) var(--ease-out),
			transform var(--duration) var(--ease-out);
	}

	.arrow-button:hover,
	.arrow-button:focus-visible {
		color: var(--color-accent);
		transform: rotate(-6deg) scale(1.06);
	}

	.gone {
		visibility: hidden;
	}

	/* The SVGs are drawn as masks so they take the text colour. Their files have
	   a few px of padding for the scribble filter, hence the sizes below. */
	.ring,
	.arrow {
		background-color: currentColor;
		mask: var(--icon) no-repeat center / 100% 100%;
	}

	.ring {
		position: absolute;
		inset: -4px;
	}

	.arrow {
		width: 48.5px;
		height: 44.8px;
	}

	.right .ring {
		--icon: url('/icons/ring-right.svg');
	}

	.left .ring {
		--icon: url('/icons/ring-left.svg');
	}

	.right .arrow {
		--icon: url('/icons/arrow-right.svg');
	}

	.left .arrow {
		--icon: url('/icons/arrow-left.svg');
	}
</style>
