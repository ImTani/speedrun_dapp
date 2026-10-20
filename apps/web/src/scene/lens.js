// The lens: one WebGL2 context for every shader view in the app (the stained-glass windows, their
// caustic light, the Gathering floor, the rose). Each view renders into the shared drawing buffer
// and the frame is copied onto the view's own 2D canvas, so a screen holds a single live context
// however many windows it shows, and a screen that shows none holds none.
//
// One clock drives every view at about 30 frames a second (ambient light does not need 60). Views
// whose canvases are off screen are skipped; nothing runs while the page is hidden. After a while
// hidden, or with no views left, the context is released and rebuilt on return: each view sets
// up again from the layers it kept, and its canvas holds the last frame meanwhile, so nothing goes
// dark. Reduced motion: views are not live; they draw a still frame, and again only on change.
// Browser-only: import dynamically from a client component.

/** Milliseconds between frames: about 30 fps, with slack for rAF jitter on 60/90/120 Hz screens. */
export const FRAME_MS = 1000 / 30 - 3;
/** Release the context after this long hidden. */
const PARK_HIDDEN_MS = 10_000;
/** Release the context after this long with no views. */
const PARK_IDLE_MS = 5_000;

/** The full-screen quad every view draws; attribute 0. */
export const VERT = `#version 300 es
in vec2 aP; out vec2 vUv;
void main(){ vUv = aP * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aP, 0., 1.); }`;

let canvas = null; // the shared drawing buffer; never in the document
let gl = null;
let gen = 0; // bumps with every new context; views set up again when it moves
let failed = false; // no WebGL2 here: views keep their SVG art
const programs = new Map(); // fragment source -> program, for the current context
const uniforms = new WeakMap(); // program -> Map(name -> location)
const views = new Set();
const owners = new Map(); // target canvas -> Set(view)
const ctx2d = new WeakMap(); // target canvas -> its 2D context
const taps = new Map(); // target canvas -> tap (a small GPU copy of each frame drawn to it)
let raf = 0;
let last = -1e9;
let parkTimer = 0;
let io = null;
let wired = false;

function create() {
	if (failed || typeof document === "undefined") return null;
	const c = document.createElement("canvas");
	c.width = 1;
	c.height = 1;
	const g = c.getContext("webgl2", {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		preserveDrawingBuffer: false,
	});
	if (!g) {
		failed = true;
		return null;
	}
	c.addEventListener("webglcontextlost", (e) => {
		e.preventDefault();
		if (gl === g) drop();
		kick();
	});
	canvas = c;
	gl = g;
	gen += 1;
	programs.clear();
	g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	const buf = g.createBuffer();
	g.bindBuffer(g.ARRAY_BUFFER, buf);
	g.bufferData(
		g.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		g.STATIC_DRAW,
	);
	g.bindVertexArray(g.createVertexArray());
	g.enableVertexAttribArray(0);
	g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
	return g;
}

function drop() {
	gl = null;
	canvas = null;
	programs.clear();
	for (const t of taps.values()) {
		t.tex = null;
		t.fbo = null;
		t.ready = false;
	}
}

/** Give the context back to the browser; the next frame that needs it builds a new one. */
function release() {
	parkTimer = 0;
	if (!gl) return;
	const g = gl;
	drop();
	g.getExtension("WEBGL_lose_context")?.loseContext();
}

function park(ms) {
	clearTimeout(parkTimer);
	parkTimer = setTimeout(release, ms);
}

function wire() {
	if (wired) return;
	wired = true;
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			cancelAnimationFrame(raf);
			raf = 0;
			park(PARK_HIDDEN_MS);
		} else {
			if (views.size) clearTimeout(parkTimer);
			kick();
		}
	});
	if (typeof IntersectionObserver !== "undefined")
		io = new IntersectionObserver((entries) => {
			for (const e of entries)
				for (const v of owners.get(e.target) ?? []) {
					v.known = true;
					if (e.isIntersecting) v.shown.add(e.target);
					else v.shown.delete(e.target);
				}
			kick();
		});
}

const seen = (v) => !v.known || v.shown.size > 0;
const isLive = (v) => (typeof v.live === "function" ? v.live() : v.live);

function kick() {
	if (raf || !views.size || typeof document === "undefined" || document.hidden)
		return;
	raf = requestAnimationFrame(tick);
}

function tick(now) {
	raf = 0;
	if (document.hidden || !views.size) return;
	const due = now - last >= FRAME_MS;
	let again = false;
	let drew = false;
	for (const v of views) {
		if (v.broken || !seen(v)) continue;
		const live = isLive(v);
		if (live) again = true;
		if (!v.dirty && !(live && due)) continue;
		const g = gl ?? create();
		if (!g) return;
		try {
			if (v.gen !== gen) {
				v.textures = [];
				v.setup(g, (src) => {
					const t = texture(g, src);
					v.textures.push(t);
					return t;
				});
				v.gen = gen;
			}
			v.dirty = false;
			v.draw(g, now, pass);
			drew = true;
		} catch (e) {
			console.error("[lens]", e);
			v.broken = true;
		}
	}
	if (due && drew) last = now;
	for (const v of views) if (v.dirty && !v.broken && seen(v)) again = true;
	// (an invalidate() made during this frame may already have queued the next one)
	if (again && !raf) raf = requestAnimationFrame(tick);
}

/**
 * Render one target: size the viewport to it, run `render`, copy the result onto its 2D canvas.
 * The shared buffer only ever grows, so passes of different sizes never reallocate it.
 */
function pass(target, render) {
	const w = target.width,
		h = target.height;
	if (!w || !h || !gl || !canvas) return;
	if (canvas.width < w) canvas.width = w;
	if (canvas.height < h) canvas.height = h;
	gl.viewport(0, 0, w, h);
	render();
	const tp = taps.get(target);
	if (tp) grab(tp, w, h);
	let x = ctx2d.get(target);
	if (x === undefined) {
		x = target.getContext("2d");
		ctx2d.set(target, x);
	}
	if (!x) return;
	// The viewport sits at the buffer's bottom-left; the copy reads from the top-left.
	x.globalCompositeOperation = "copy";
	x.drawImage(canvas, 0, gl.drawingBufferHeight - h, w, h, 0, 0, w, h);
}

/** Longest side of a tap's copy, in pixels: a light mask, not a picture. */
const TAP_MAX = 128;

/** Copy the frame just rendered for a tapped target into its small texture (GPU only, scaled). */
function grab(tp, w, h) {
	const g = gl;
	const k = Math.min(1, TAP_MAX / Math.max(w, h));
	const tw = Math.max(1, Math.round(w * k));
	const th = Math.max(1, Math.round(h * k));
	if (!tp.tex || tp.gen !== gen || tp.w !== tw || tp.h !== th) {
		if (tp.tex && tp.gen === gen) {
			g.deleteTexture(tp.tex);
			g.deleteFramebuffer(tp.fbo);
		}
		const [t, f] = renderTarget(g, tw, th);
		tp.tex = t;
		tp.fbo = f;
		tp.gen = gen;
		tp.w = tw;
		tp.h = th;
	}
	g.bindFramebuffer(g.READ_FRAMEBUFFER, null);
	g.bindFramebuffer(g.DRAW_FRAMEBUFFER, tp.fbo);
	g.blitFramebuffer(0, 0, w, h, 0, 0, tw, th, g.COLOR_BUFFER_BIT, g.LINEAR);
	g.bindFramebuffer(g.FRAMEBUFFER, null);
	tp.ready = true;
	for (const f of tp.listeners) f();
}

/**
 * An offscreen render target on the current context: [texture, framebuffer], RGBA8, linear,
 * clamped. The caller owns both (delete them in its view's `dispose`).
 */
export function renderTarget(g, w, h) {
	const t = g.createTexture();
	g.activeTexture(g.TEXTURE0);
	g.bindTexture(g.TEXTURE_2D, t);
	g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA8, w, h);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
	const f = g.createFramebuffer();
	g.bindFramebuffer(g.FRAMEBUFFER, f);
	g.framebufferTexture2D(
		g.FRAMEBUFFER,
		g.COLOR_ATTACHMENT0,
		g.TEXTURE_2D,
		t,
		0,
	);
	g.bindFramebuffer(g.FRAMEBUFFER, null);
	return [t, f];
}

/**
 * Tap a view's target canvas: each time the lens draws it, a small copy of that frame (longest
 * side TAP_MAX; GL orientation, row 0 at the bottom) lands in a texture on the shared context, so
 * another view can read what was rendered without a CPU readback (the atmosphere's light mask).
 * Taps are counted per canvas; the copy is freed when the last holder releases it.
 */
export function tap(canvasEl) {
	let tp = taps.get(canvasEl);
	if (!tp) {
		tp = {
			tex: null,
			fbo: null,
			gen: -1,
			w: 0,
			h: 0,
			ready: false,
			refs: 0,
			listeners: new Set(),
		};
		taps.set(canvasEl, tp);
		// Its views draw once more so the copy fills even if they are still (reduced motion).
		for (const v of owners.get(canvasEl) ?? []) v.dirty = true;
		kick();
	}
	tp.refs += 1;
	const t = tp;
	let gone = false;
	let own = null;
	return {
		target: canvasEl,
		texture: () => (t.ready && t.gen === gen && gl ? t.tex : null),
		onDraw(fn) {
			if (own) t.listeners.delete(own);
			own = fn ?? null;
			if (own) t.listeners.add(own);
		},
		release() {
			if (gone) return;
			gone = true;
			if (own) t.listeners.delete(own);
			t.refs -= 1;
			if (t.refs > 0) return;
			taps.delete(canvasEl);
			if (gl && t.gen === gen && t.tex) {
				gl.deleteTexture(t.tex);
				gl.deleteFramebuffer(t.fbo);
			}
		},
	};
}

function compile(g, fs) {
	const sh = (type, src) => {
		const s = g.createShader(type);
		g.shaderSource(s, src);
		g.compileShader(s);
		if (!g.getShaderParameter(s, g.COMPILE_STATUS))
			throw new Error(g.getShaderInfoLog(s) ?? "shader");
		return s;
	};
	const p = g.createProgram();
	const vs = sh(g.VERTEX_SHADER, VERT);
	const f = sh(g.FRAGMENT_SHADER, fs);
	g.attachShader(p, vs);
	g.attachShader(p, f);
	g.bindAttribLocation(p, 0, "aP");
	g.linkProgram(p);
	if (!g.getProgramParameter(p, g.LINK_STATUS))
		throw new Error(g.getProgramInfoLog(p) ?? "link");
	g.deleteShader(vs);
	g.deleteShader(f);
	return p;
}

/** The program for a fragment shader on the current context (compiled once, shared by views). */
export function program(g, fs) {
	let p = programs.get(fs);
	if (!p) {
		p = compile(g, fs);
		programs.set(fs, p);
	}
	return p;
}

/** A uniform location, looked up once per program. */
export function uniform(g, p, name) {
	let m = uniforms.get(p);
	if (!m) {
		m = new Map();
		uniforms.set(p, m);
	}
	let u = m.get(name);
	if (u === undefined) {
		u = g.getUniformLocation(p, name);
		m.set(name, u);
	}
	return u;
}

/** Upload a layer into a texture (created when `t` is null). */
export function upload(g, t, src) {
	const tex = t ?? g.createTexture();
	g.activeTexture(g.TEXTURE0);
	g.bindTexture(g.TEXTURE_2D, tex);
	g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, src);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
	g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
	return tex;
}
const texture = (g, src) => upload(g, null, src);

/** Bind textures to units 0..n-1, in order. */
export function bind(g, list) {
	list.forEach((t, i) => {
		g.activeTexture(g.TEXTURE0 + i);
		g.bindTexture(g.TEXTURE_2D, t);
	});
}

/**
 * True when the lens can draw here: a WebGL2 context exists (or was just made) and every given
 * fragment shader compiles on it. Callers keep their SVG art when this is false.
 */
export function lensReady(...frags) {
	const g = gl ?? create();
	if (!g) return false;
	try {
		for (const fs of frags) program(g, fs);
		return true;
	} catch (e) {
		console.error("[lens]", e);
		return false;
	}
}

/**
 * Register a view.
 *  targets: the 2D canvases it paints (it sleeps while none is on screen)
 *  live:    true (or a function returning true) while it animates on its own
 *  setup(gl, texture): build its textures on the current context; runs again after a rebuild
 *  draw(gl, now, pass): render; call pass(target, render) once per target
 *  dispose(gl):         optional; free what it made beyond its textures (framebuffers)
 * Returns { invalidate() (draw on the next frame), remove() }.
 */
export function addView(spec) {
	wire();
	const v = {
		...spec,
		gen: -1,
		dirty: true,
		broken: false,
		known: false,
		shown: new Set(),
		textures: [],
	};
	views.add(v);
	for (const t of v.targets) {
		let set = owners.get(t);
		if (!set) {
			set = new Set();
			owners.set(t, set);
			io?.observe(t);
		}
		set.add(v);
	}
	clearTimeout(parkTimer);
	kick();
	let gone = false;
	return {
		invalidate() {
			if (gone) return;
			v.dirty = true;
			kick();
		},
		remove() {
			if (gone) return;
			gone = true;
			views.delete(v);
			for (const t of v.targets) {
				const set = owners.get(t);
				set?.delete(v);
				if (set && !set.size) {
					owners.delete(t);
					io?.unobserve(t);
				}
			}
			if (gl && v.gen === gen) {
				for (const t of v.textures) gl.deleteTexture(t);
				try {
					v.dispose?.(gl);
				} catch (e) {
					console.error("[lens]", e);
				}
			}
			v.textures = [];
			if (!views.size) park(PARK_IDLE_MS);
		},
	};
}

/** Ease `cur` toward `to` at a per-60fps-frame rate `k`, for a step of `dt` seconds. */
export function ease(cur, to, k, dt) {
	return cur + (to - cur) * (1 - (1 - k) ** Math.min(6, dt * 60));
}
