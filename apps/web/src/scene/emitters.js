// Where the light lives. Scenes register their light sources here (stained glass, candle flames,
// ember eyes, gilt highlights) and the atmosphere (atmosgl.js) reads the registry each frame to
// place bloom, candle light, glass spill, embers and glints. Nothing here draws or touches WebGL.
//
//   const h = registerEmitter({ kind: "candle", anchor: flameEl, x: 0.5, y: 0.6, radius: 4 });
//   h.update({ intensity: 0.5 });   // cheap; read on the next atmosphere frame
//   h.remove();                     // on unmount
//
// Positions: with an `anchor` element, x and y are fractions of its painted box (its
// getBoundingClientRect, so transforms, scaling and scrolling are followed) and `radius` is in
// anchor widths. Without one, x, y and radius are viewport CSS px. Glass with an anchor covers the
// anchor's box; without one it is a `w` x `h` box centred on x, y.
// An atmosphere only uses the emitters inside its own scene (its scope element contains the anchor,
// or, unanchored, the point falls inside its box). Browser-only in practice (call from effects).

const all = new Set();
const subs = new Set();
let seq = 0;

/** A colour as linear-ish 0..1 RGB: "#rgb", "#rrggbb" or [r, g, b]. */
export function rgbOf(c, fallback = [1, 0.72, 0.4]) {
	if (Array.isArray(c) && c.length >= 3) return [c[0], c[1], c[2]];
	if (typeof c !== "string") return fallback;
	let h = c.trim().replace(/^#/, "");
	if (h.length === 3)
		h = h
			.split("")
			.map((x) => x + x)
			.join("");
	if (!/^[0-9a-f]{6}$/i.test(h)) return fallback;
	const n = Number.parseInt(h, 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function notify() {
	for (const f of subs) {
		try {
			f();
		} catch (e) {
			console.error("[emitters]", e);
		}
	}
}

/**
 * Register a light source. Returns { update(partial), remove() }.
 *  kind:      "glass" | "candle" | "ember" | "gilt"
 *  anchor:    element the emitter rides on (optional)
 *  x, y:      position (fractions of the anchor's box, default 0.5; else viewport px)
 *  radius:    reach of its light (anchor widths, or px)
 *  base:      candles: where it stands (same units as y); its floor pool lies there
 *  w, h:      unanchored glass only: its box in px
 *  color:     "#hex" or [r, g, b] 0..1 (glass with a shader: its own light is used instead)
 *  intensity: 0..n, default 1 (0 hides it without unregistering)
 *  phase:     0..1, de-synchronises flicker and twinkle (default: a per-emitter hash)
 */
export function registerEmitter(spec) {
	seq += 1;
	const e = {
		x: 0.5,
		y: 0.5,
		radius: 1,
		intensity: 1,
		phase: (Math.sin(seq * 91.345) * 43758.5453) % 1,
		...spec,
	};
	e.phase = Math.abs(e.phase);
	e.rgb = rgbOf(e.color, e.kind === "gilt" ? [1, 0.84, 0.52] : undefined);
	all.add(e);
	notify();
	let gone = false;
	return {
		update(p) {
			if (gone) return;
			let moved = false;
			for (const k in p)
				if (e[k] !== p[k]) {
					e[k] = p[k];
					moved = true;
				}
			if (!moved) return;
			if ("color" in p) e.rgb = rgbOf(e.color);
			notify();
		},
		remove() {
			if (gone) return;
			gone = true;
			all.delete(e);
			notify();
		},
	};
}

/** Every registered emitter (live set: read, do not mutate). */
export function allEmitters() {
	return all;
}

/** Called whenever an emitter comes, goes or changes. Returns an unsubscribe function. */
export function onEmitters(fn) {
	subs.add(fn);
	return () => subs.delete(fn);
}
