// Spray paint for the menu: the nozzle path over the menu words, the drips and
// the animation that sprays the words when the menu opens.
// Plain canvas + CSS masks, no libraries. Coordinates are CSS px relative to
// the top-left corner of the menu card.

// Timing (ms). Three words ≈ 800ms in total.
const WORD_MS = 230; // one sweep of the nozzle across a word
const MOVE_MS = 50; // moving to the start of the next word, trigger released
const DRIP_MS = 180; // drips growing after the last word

// ---------------------------------------------------------------------------
// Nozzle path — the one place the route is defined, so the painter character
// can follow exactly the same path later.
// ---------------------------------------------------------------------------

// One sweep left→right per word, with a short move (no paint) to the next word.
// `lines` are the words' boxes: [{ left, right, y }] with y the vertical middle.
// Returns { points, duration }: each point has x, y, t (0–1 over the whole
// animation) and spray (whether paint comes out on the way to that point).
export function getNozzlePath(lines) {
	const duration = lines.length * WORD_MS + (lines.length - 1) * MOVE_MS;
	const points = [];
	let time = 0;
	lines.forEach((line, i) => {
		if (i > 0) time += MOVE_MS;
		points.push({ x: line.left, y: line.y, t: time / duration, spray: false });
		time += WORD_MS;
		// Ends 2px lower: a hand-held stroke is never perfectly level
		points.push({ x: line.right, y: line.y + 2, t: time / duration, spray: true });
	});
	return { points, duration };
}

// Nozzle position at progress t (0–1), and whether it's spraying there.
export function pointAt(path, t) {
	const { points } = path;
	let i = 1;
	while (i < points.length - 1 && points[i].t < t) i++;
	const a = points[i - 1];
	const b = points[i];
	const k = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)));
	return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, spray: b.spray };
}

// How far (0–1) the nozzle has swept across word i after `elapsed` ms.
export function wordProgress(i, elapsed) {
	return Math.min(1, Math.max(0, (elapsed - i * (WORD_MS + MOVE_MS)) / WORD_MS));
}

// ---------------------------------------------------------------------------
// Drawing (uses the context's current fillStyle)
// ---------------------------------------------------------------------------

// Two small drips running down from random letters.
export function planDrips(lines, fontSize, rand = Math.random) {
	return Array.from({ length: 2 }, () => {
		const line = lines[Math.floor(rand() * lines.length)];
		const width = line.right - line.left;
		return {
			x: line.left + width * (0.15 + rand() * 0.7),
			y: line.y + fontSize * 0.25, // starts inside the letters so it looks attached
			length: fontSize * (0.15 + rand() * 0.25),
			width: 1.5 + rand()
		};
	});
}

// Draws the part of each drip between progress `from` and `to` (0–1), so a
// drip grows frame by frame without painting over itself.
export function drawDrips(ctx, drips, from, to) {
	for (const drip of drips) {
		const top = drip.y + drip.length * from;
		const bottom = drip.y + drip.length * to;
		ctx.fillRect(drip.x - drip.width / 2, top, drip.width, bottom - top);
		if (to === 1) {
			// Round drop at the end
			ctx.beginPath();
			ctx.arc(drip.x, bottom, drip.width * 0.8, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

// Sprays the menu words. Each link is revealed left→right behind the nozzle
// through its --reveal CSS variable, and the canvas gets the drips. `painter` (optional) is moved along with the nozzle. One
// requestAnimationFrame loop that stops by itself; afterwards the canvas is a
// static image. With reducedMotion the finished result is drawn at once.
// Returns a cancel function.
export function paintMenu({ canvas, card, links, painter, reducedMotion }) {
	const cardBox = card.getBoundingClientRect();
	const lines = links.map((link) => {
		const box = link.getBoundingClientRect();
		return {
			left: box.left - cardBox.left,
			right: box.right - cardBox.left,
			y: box.top - cardBox.top + box.height / 2
		};
	});
	const fontSize = parseFloat(getComputedStyle(links[0]).fontSize);

	// Canvas sized in device px so it's sharp on retina screens
	const dpr = Math.min(window.devicePixelRatio || 1, 2); // 2× is sharp enough and keeps it fast
	canvas.width = Math.ceil(cardBox.width * dpr);
	canvas.height = Math.ceil(cardBox.height * dpr);
	const ctx = canvas.getContext('2d');
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = '#fff';

	const path = getNozzlePath(lines);
	const drips = planDrips(lines, fontSize);

	if (reducedMotion) {
		drawDrips(ctx, drips, 0, 1);
		return () => {};
	}

	// Hide all words until the nozzle reaches them
	for (const link of links) link.style.setProperty('--reveal', '0%');

	let frame;
	let dripped = 0;
	const start = performance.now();

	function tick(now) {
		const elapsed = Math.min(now - start, path.duration + DRIP_MS);

		// The word behind the nozzle: 140% pushes the speckled edge fully past the end
		links.forEach((link, i) => {
			link.style.setProperty('--reveal', `${wordProgress(i, elapsed) * 140}%`);
		});

		if (painter) {
			const nozzle = pointAt(path, Math.min(1, elapsed / path.duration));
			painter.style.transform = `translate(${nozzle.x}px, ${nozzle.y}px)`;
		}

		// Drips grow once the last word is done
		const drip = Math.min(1, Math.max(0, (elapsed - path.duration) / DRIP_MS));
		if (drip > dripped) {
			drawDrips(ctx, drips, dripped, drip);
			dripped = drip;
		}

		if (drip < 1) frame = requestAnimationFrame(tick);
		else reset();
	}

	// Back to the CSS default (fully visible)
	function reset() {
		for (const link of links) link.style.removeProperty('--reveal');
	}

	frame = requestAnimationFrame(tick);
	return () => {
		cancelAnimationFrame(frame);
		reset();
	};
}
