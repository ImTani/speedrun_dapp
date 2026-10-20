// The atmosphere's light layer, rebuilt every lens frame and painted onto one 2D canvas that the
// page lays over the scene with mix-blend-mode: screen. Two sources of light:
//  - the glass the lens has just drawn (lens.tap: a GPU-side copy, no readback): god rays, the
//    glass bloom on the stone, the rim on the arch, its mean colour washing the floor;
//  - the emitter registry (emitters.js): candles, ember eyes, gilt glints and any glass without a
//    shader, drawn analytically in the composite (no extra passes, no geometry).
// The pass list, sizes and sample counts are documented at the top of atmosphere.ts; the strengths
// live there too. Every canvas glassgl.js mounts is marked data-lens-glass and is tapped when it is
// inside `scope` (the scene root); emitters count when their anchor is inside `scope`.
// Browser-only: import dynamically from a client component.
import { allEmitters, onEmitters } from "./emitters.js";
import {
	addView,
	bind,
	ease,
	lensReady,
	program,
	renderTarget,
	tap,
	uniform,
} from "./lens.js";

/** Most windows and point emitters one composite handles (uniform arrays). */
const MAX_GLASS = 4;
const MAX_POINTS = 12;
const KIND = { candle: 0, ember: 1, gilt: 2 };

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
// Offscreen targets here keep GL rows (0 at the bottom): sample them with up(), not vUv.
vec2 up(){ return vec2(vUv.x, 1. - vUv.y); }
`;

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n)); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(h21(vec2(i, 1.)), h21(vec2(i + 1., 1.)), f); }`;

/** A tapped window into the light mask: the lit glass squared toward linear light; a = coverage. */
const COPY = `${HEAD}
uniform sampler2D uSrc;
void main(){ vec4 s = texture(uSrc, up()); o = vec4(s.rgb * s.rgb, s.a); }`;

/** Each window's mean light (one texel per window): 16 taps over its rect, per covered area. */
const AVG = `${HEAD}
uniform sampler2D uSrc; uniform vec4 uG[${MAX_GLASS}];
void main(){
  int i = int(gl_FragCoord.x);
  vec4 g = uG[0];
  for (int k = 1; k < ${MAX_GLASS}; k++) if (k == i) g = uG[k];
  vec4 a = vec4(0);
  for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++)
    a += texture(uSrc, mix(g.xy, g.zw, (vec2(x, y) + .5) / 4.));
  o = vec4(a.rgb / max(a.a, .5), 1.);
}`;

/** Radial blur toward the light (screen-space light scattering), decaying with distance. */
const RAYS = `${HEAD}
uniform sampler2D uSrc; uniform vec2 uL; uniform float uReach, uDecay; uniform int uN;
void main(){
  vec2 p = up();
  vec2 d = (uL - p) * (uReach / float(uN));
  vec3 a = vec3(0); float w = 1.;
  for (int i = 0; i < 48; i++) {
    if (i >= uN) break;
    a += texture(uSrc, p).rgb * w;
    w *= uDecay; p += d;
  }
  o = vec4(a / float(uN), 1.);
}`;

/** Bloom source: 4-tap downsample and a soft threshold (the flames are analytic now). */
const DOWN = `${HEAD}
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uTh, uKnee;
void main(){
  vec2 p = up();
  vec3 c = .25 * (texture(uSrc, p + uTexel * vec2(-1., -1.)).rgb + texture(uSrc, p + uTexel * vec2(1., -1.)).rgb
                + texture(uSrc, p + uTexel * vec2(-1., 1.)).rgb + texture(uSrc, p + uTexel * vec2(1., 1.)).rgb);
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(uTh, uTh + uKnee, l), 1.);
}`;

/** Separable 9-tap gaussian in 5 linear fetches. */
const BLUR = `${HEAD}
uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  vec2 p = up(), a = uDir * 1.3846154, b = uDir * 3.2307692;
  vec3 c = texture(uSrc, p).rgb * .2270270
         + (texture(uSrc, p + a).rgb + texture(uSrc, p - a).rgb) * .3162162
         + (texture(uSrc, p + b).rgb + texture(uSrc, p - b).rgb) * .0702703;
  o = vec4(c, 1.);
}`;

/**
 * Everything the screen layer adds (premultiplied: see the note at its end). Distances are in box
 * heights (q = p scaled by the aspect), so circles stay round on any box.
 */
const COMPOSE = `${HEAD}
uniform sampler2D uRays, uBloom, uMask, uAvg;
uniform vec2 uL, uMaskTexel;
uniform float uT, uFade, uAspect, uPxH, uFloor, uShimmer;
uniform float uRaysK, uBloomK, uOnGlass, uRimK, uSpillK, uSpillDepth, uGlassHalo;
uniform float uCandleK, uCore, uCoreR, uHalo, uHaloR, uWall, uFloorK, uReach, uFlick;
uniform float uECore, uECoreR, uESpill, uGilt, uGiltRate;
uniform float uEmbK, uEmbRise, uEmbLife;
uniform float uMotesK, uMoteCandle, uMoteDark, uCell, uRad;
uniform vec3 uLift;
// glass: rect (GL uv: x0, y0 bottom, x1, y1 top), colour + intensity, tapped (1) or analytic (0)
uniform vec4 uG[${MAX_GLASS}]; uniform vec4 uGC[${MAX_GLASS}]; uniform float uGT[${MAX_GLASS}]; uniform int uGN;
// points: xy (GL uv), z radius (box heights), w intensity; colour; (kind, phase, base offset, 0)
uniform vec4 uP[${MAX_POINTS}]; uniform vec4 uPC[${MAX_POINTS}]; uniform vec4 uPK[${MAX_POINTS}]; uniform int uPN;
${NOISE}
const float PI = 3.14159265;
// Dust: two drifting grids, at most one mote per cell, rising slowly and swaying in place.
float motes(vec2 px, float t){
  float s = 0.;
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    float cell = uCell * (1. + fl * .7);
    vec2 g = px / cell - vec2(0., t * (.05 - fl * .018));
    vec2 id = floor(g), f = fract(g);
    float h = h21(id + fl * 17.3);
    if (h > .45) continue;
    vec2 c = .3 + .4 * h22(id + 3.1) + .12 * vec2(sin(t * (.31 + h) + h * 40.), cos(t * (.23 + h) + h * 23.));
    float d = length((f - c) * cell);
    float r = uRad * (.7 + h * 1.4) * (1. - fl * .3);
    float tw = .55 + .45 * sin(t * (.9 + h * 2.) + h * 71.);
    s += smoothstep(r, r * .2, d) * tw;
  }
  return s;
}
// A slow, smooth flicker around 1 (two octaves of value noise under 2 Hz: never a strobe).
float flicker(float ph){
  return 1. + uFlick * ((n1(uT * 1.3 + ph * 37.) - .5) * 1.4 + (n1(uT * 2.9 + ph * 11.) - .5) * .6);
}
void main(){
  vec2 p = up();
  vec2 q = p * vec2(uAspect, 1.);
  vec4 m = texture(uMask, p);
  float cover = clamp(m.a, 0., 1.);
  float ml = max(m.r, max(m.g, m.b));

  // ---- glass: shafts, bloom on the stone, rim on the arch ----
  vec3 r = texture(uRays, p).rgb;
  vec2 ld = p - uL;
  float ang = atan(ld.x, -ld.y);
  float band = n1(ang * 26. + uT * .12) * .6 + n1(ang * 63. - uT * .17) * .4;
  vec3 rays = r * (1. + uShimmer * (band - .5) * 2.) * (1. - max(cover, min(ml * 1.6, 1.)) * .9) * uRaysK;
  vec3 bloom = texture(uBloom, p).rgb * uBloomK * mix(1., uOnGlass, cover);
  vec2 e = uMaskTexel;
  vec3 near = .15 * (texture(uMask, p + e * vec2(1.5, .5)).rgb + texture(uMask, p + e * vec2(-.5, 1.5)).rgb
                   + texture(uMask, p + e * vec2(-1.5, -.5)).rgb + texture(uMask, p + e * vec2(.5, -1.5)).rgb)
            + .1 * (texture(uMask, p + e * vec2(4., 1.)).rgb + texture(uMask, p + e * vec2(-1., 4.)).rgb
                  + texture(uMask, p + e * vec2(-4., -1.)).rgb + texture(uMask, p + e * vec2(1., -4.)).rgb);
  vec3 rim = near * uRimK * (1. - cover);

  // ---- per window: its colour washing the floor; analytic halo and rim when it has no shader ----
  vec3 spill = vec3(0);
  for (int i = 0; i < ${MAX_GLASS}; i++) {
    if (i >= uGN) break;
    vec4 g = uG[i];
    vec3 gc = uGT[i] > .5 ? sqrt(texelFetch(uAvg, ivec2(i, 0), 0).rgb) : uGC[i].rgb * uGC[i].a;
    float wq = (g.z - g.x) * uAspect;
    float yF = min(uFloor, g.y);
    float below = yF - p.y;
    if (below > 0. && uSpillK > 0.) {
      float dx = (q.x - (g.x + g.z) * .5 * uAspect) / (wq * .75 + below * .9);
      spill += gc * uSpillK * exp(-dx * dx * 2.2) * exp(-below / uSpillDepth) * smoothstep(0., .025, below);
    }
    if (uGT[i] < .5) {
      vec2 hb = vec2(wq, g.w - g.y) * .5;
      vec2 bd = abs(q - vec2((g.x + g.z) * .5 * uAspect, (g.y + g.w) * .5)) - hb;
      float sd = length(max(bd, 0.)) + min(max(bd.x, bd.y), 0.);
      if (sd > 0.)
        spill += gc * (exp(-sd / (hb.x * .55)) * uGlassHalo * uBloomK + exp(-sd / (hb.x * .07)) * uRimK * .35);
    }
  }

  // ---- candles, ember eyes, gilt glints ----
  vec3 pts = vec3(0), lit = vec3(0);
  for (int i = 0; i < ${MAX_POINTS}; i++) {
    if (i >= uPN) break;
    vec4 P = uP[i]; vec3 C = uPC[i].rgb; vec4 K = uPK[i];
    vec2 d = q - P.xy * vec2(uAspect, 1.);
    float R = P.z, I = P.w, r2 = dot(d, d);
    if (K.x < .5) {
      // candle: hot core, warm halo, light on the wall and the floor it stands on, embers
      float reach = R * uReach;
      if (r2 > reach * reach) continue;
      float fl = flicker(K.y);
      vec2 dc = d / (R * uCoreR * vec2(1., 1.6));
      float hr = R * uHaloR;
      pts += (vec3(1., .86, .62) * exp(-dot(dc, dc)) * uCore + C * exp(-r2 / (hr * hr)) * uHalo) * uBloomK * I * fl;
      float wall = max(1. / (1. + r2 / (R * R) * 2.) - 1. / (1. + uReach * uReach * 2.), 0.);
      vec2 df = (d + vec2(0., K.z)) / (R * vec2(1.9, .42));
      vec3 l = C * (wall * uWall + exp(-dot(df, df)) * uFloorK) * uCandleK * I * fl;
      lit += l;
      if (uEmbK > 0.) {
        for (int j = 0; j < 3; j++) {
          float fj = float(j);
          float life = uEmbLife * (.8 + .4 * h21(vec2(K.y * 91., fj)));
          float cyc = uT / life + fj / 3. + K.y;
          float a = fract(cyc);
          float hh = h21(vec2(floor(cyc), fj + K.y * 13.));
          if (hh > .7) continue;
          vec2 ep = vec2((hh - .35) * R * .4 + sin(a * 5. + hh * 20.) * R * .1, R * .12 + a * uEmbRise * R);
          float er = 1.1 * uPxH;
          float b = smoothstep(er * 1.8, er * .2, length(d - ep)) * sin(PI * a) * (1. - a * .5);
          pts += vec3(1., .5, .18) * b * uEmbK * I;
        }
      }
    } else if (K.x < 1.5) {
      // ember eyes: a small hot bloom, a faint red spill on what is around them
      if (r2 > R * R * 4.) continue;
      float pulse = .9 + .1 * n1(uT * .8 + K.y * 20.);
      float cr = R * uECoreR;
      pts += (vec3(1., .62, .3) * exp(-r2 / (cr * cr)) * uECore + C * exp(-r2 / (R * R)) * uESpill) * uBloomK * I * pulse;
    } else {
      // gilt: a rare slow glint (a narrow peak of a slow sine), a small four-point star
      vec2 g = abs(d) / R;
      if (max(g.x, g.y) > 1.) continue;
      float tw = pow(max(0., sin(uT * uGiltRate * PI / 60. + K.y * 6.2832)), 28.);
      float star = exp(-dot(g, g) * 60.) + (exp(-g.x * 7.) * exp(-g.y * g.y * 1600.) + exp(-g.y * 7.) * exp(-g.x * g.x * 1600.)) * .45;
      pts += C * star * tw * uGilt * uBloomK * I;
    }
  }

  // ---- dust: lit by the shafts and the candles; the faintest motes in the dark ----
  vec3 dust = vec3(0);
  if (uMotesK > 0.)
    dust = motes(gl_FragCoord.xy, uT) * uMotesK * (r * 3.2 + lit * uMoteCandle + vec3(.85, .78, .68) * uMoteDark);

  vec3 c = min((rays + bloom + rim + spill + pts + lit + dust) * uFade + uLift, vec3(1.));
  // Premultiplied, alpha = the brightest channel: under mix-blend screen this is exactly
  // screen(backdrop, c) over an opaque scene, and plain added light where the scene is transparent
  // (an opaque black would paint itself there).
  o = vec4(c, max(c.r, max(c.g, c.b)));
}`;

const FRAGS = [COPY, AVG, RAYS, DOWN, BLUR, COMPOSE];
/** Ceiling on the composite's pixel count (a 1920 x 1080 box at half resolution). */
const MAX_PX = 520_000;
/** Samples in the long ray pass and in the gap-filling short pass. */
const RAY_N = 32;
const RAY_N2 = 8;
/** How often to look for glass that came or went (ms); emitters also notify on change. */
const SCAN_MS = 700;

/**
 * Mount the light layer onto `canvas` (a 2D canvas over the scene, CSS-sized).
 *  scope:  where to look for data-lens-glass canvases and registered emitters
 *  look:   strengths (atmosphere.ts); base: the constants they scale (atmosphere.ts BASE)
 *  lean:   horizontal px of shaft per vertical px (+ leans down to the right)
 *  rise:   the light's height above the top edge, in box heights
 *  floor:  where the floor line sits, from the top, in box heights; null = just under the
 *          lowest window (the spill pools below it)
 * Returns { set(look), setFloor(y), destroy() }, or null without WebGL2 (the CSS layers remain).
 */
export function mountAtmosphere({
	canvas,
	scope,
	look,
	base,
	lean = 0.14,
	rise = 0.9,
	floor = 0.62,
	reduce = false,
}) {
	if (!canvas.getContext("2d")) return null;
	if (!lensReady(...FRAGS)) return null;
	let L = { ...look };
	const B = base;
	let floorY = floor;
	let W = 0,
		H = 0,
		MW = 0,
		MH = 0,
		BW = 0,
		BH = 0,
		k = 1;
	let fb = null;
	let fbDirty = true;
	const taps = new Map();
	/** Registered emitters in this scene (glass, candle, ember, gilt), refreshed on change. */
	let mine = [];
	let fade = reduce ? 1 : 0;
	let prev = 0;
	const t0 = performance.now();
	let view = null;

	function size() {
		const cw = canvas.clientWidth,
			ch = canvas.clientHeight;
		if (!cw || !ch) {
			W = H = 0;
			return;
		}
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let s = 0.5 * dpr;
		if (cw * ch * s * s > MAX_PX) s = Math.sqrt(MAX_PX / (cw * ch));
		const w = Math.max(16, Math.round(cw * s)),
			h = Math.max(16, Math.round(ch * s));
		if (w === W && h === H) return;
		W = w;
		H = h;
		k = s;
		canvas.width = W;
		canvas.height = H;
		MW = Math.max(8, Math.round(W / 2));
		MH = Math.max(8, Math.round(H / 2));
		BW = Math.max(4, Math.round(W / 4));
		BH = Math.max(4, Math.round(H / 4));
		fbDirty = true;
	}

	function pick() {
		const next = [];
		for (const e of allEmitters())
			if (!e.anchor || (e.anchor.isConnected && scope.contains(e.anchor)))
				next.push(e);
		mine = next;
	}

	function scan() {
		const found = new Set(scope.querySelectorAll("canvas[data-lens-glass]"));
		let changed = false;
		for (const [c, t] of taps)
			if (!found.has(c) || !c.isConnected) {
				t.release();
				taps.delete(c);
				changed = true;
			}
		for (const c of found)
			if (!taps.has(c)) {
				const t = tap(c);
				// Still frames: redraw the light whenever the glass is redrawn.
				if (reduce) t.onDraw(() => queueMicrotask(() => view?.invalidate()));
				taps.set(c, t);
				changed = true;
			}
		const n = mine.length;
		pick();
		if (changed || n !== mine.length) view?.invalidate();
	}

	function free(gl) {
		if (!fb) return;
		for (const [t, f] of Object.values(fb)) {
			gl.deleteTexture(t);
			gl.deleteFramebuffer(f);
		}
		fb = null;
	}

	function ensure(gl) {
		if (fb && !fbDirty) return;
		free(gl);
		fb = {
			M: renderTarget(gl, MW, MH),
			A: renderTarget(gl, MAX_GLASS, 1),
			R1: renderTarget(gl, MW, MH),
			R2: renderTarget(gl, MW, MH),
			B1: renderTarget(gl, BW, BH),
			B2: renderTarget(gl, BW, BH),
		};
		fbDirty = false;
	}

	// Per-frame emitter uniforms, reused.
	const G = new Float32Array(MAX_GLASS * 4);
	const GC = new Float32Array(MAX_GLASS * 4);
	const GT = new Float32Array(MAX_GLASS);
	const P = new Float32Array(MAX_POINTS * 4);
	const PC = new Float32Array(MAX_POINTS * 4);
	const PK = new Float32Array(MAX_POINTS * 4);

	/** A box (client rect) in GL uv of the host: [x0, y0 (bottom), x1, y1 (top)]. */
	const uvRect = (r, host) => [
		(r.left - host.left) / host.width,
		1 - (r.bottom - host.top) / host.height,
		(r.right - host.left) / host.width,
		1 - (r.top - host.top) / host.height,
	];
	const offBox = (q) =>
		q[2] < -0.05 || q[0] > 1.05 || q[3] < -0.05 || q[1] > 1.05;

	/** Place this frame's windows and point lights. Returns [glass count, point count, lowest glass]. */
	function gather(host) {
		let gn = 0,
			pn = 0,
			low = -1;
		const claimed = new Set();
		const addGlass = (q, rgb, intensity, tapped) => {
			if (gn >= MAX_GLASS || offBox(q)) return;
			G.set(q, gn * 4);
			GC.set([rgb[0], rgb[1], rgb[2], intensity], gn * 4);
			GT[gn] = tapped ? 1 : 0;
			gn += 1;
			// lowest glass bottom, from the top, in box heights
			low = Math.max(low, 1 - q[1]);
		};
		for (const tp of taps.values()) {
			if (!tp.texture()) continue;
			const r = tp.target.getBoundingClientRect();
			if (r.width < 1 || r.height < 1) continue;
			let reg = null;
			for (const e of mine)
				if (
					e.kind === "glass" &&
					e.anchor &&
					(e.anchor === tp.target || e.anchor.contains(tp.target))
				) {
					reg = e;
					claimed.add(e);
					break;
				}
			addGlass(uvRect(r, host), reg?.rgb ?? [1, 0.8, 0.5], 1, true);
		}
		for (const e of mine) {
			if (e.intensity <= 0) continue;
			if (e.kind === "glass") {
				if (claimed.has(e)) continue;
				let r;
				if (e.anchor) r = e.anchor.getBoundingClientRect();
				else {
					const w = e.w ?? 0,
						h = e.h ?? 0;
					r = {
						left: e.x - w / 2,
						right: e.x + w / 2,
						top: e.y - h / 2,
						bottom: e.y + h / 2,
						width: w,
						height: h,
					};
				}
				if (r.width < 1 || r.height < 1) continue;
				addGlass(uvRect(r, host), e.rgb, e.intensity, false);
				continue;
			}
			if (pn >= MAX_POINTS) continue;
			const kind = KIND[e.kind];
			if (kind === undefined) continue;
			let px = e.x,
				py = e.y,
				rad = e.radius,
				baseY = e.base ?? e.y;
			if (e.anchor) {
				const r = e.anchor.getBoundingClientRect();
				if (r.width < 0.5 || r.height < 0.5) continue;
				px = r.left + e.x * r.width;
				py = r.top + e.y * r.height;
				rad = e.radius * r.width;
				baseY = r.top + (e.base ?? e.y) * r.height;
			}
			const u = (px - host.left) / host.width;
			const v = 1 - (py - host.top) / host.height;
			const R = rad / host.height;
			const reach = R * (kind === 0 ? B.candleReach : 2);
			if (
				u * host.width < -reach * host.height ||
				(u - 1) * host.width > reach * host.height ||
				v < -reach ||
				v > 1 + reach
			)
				continue;
			// Where its floor pool lies below it (a candle with no `base`: just under the flame).
			const drop = e.base === undefined ? R * 0.55 : (baseY - py) / host.height;
			P.set([u, v, R, e.intensity], pn * 4);
			PC.set(e.rgb, pn * 4);
			PK.set([kind, e.phase, drop, 0], pn * 4);
			pn += 1;
		}
		return [gn, pn, low];
	}

	function draw(gl, now, pass) {
		if (!W || !H) return;
		const host = canvas.getBoundingClientRect();
		if (host.width < 1 || host.height < 1) return;
		ensure(gl);
		const t = reduce ? 0 : (now - t0) / 1000;
		const dt = prev ? Math.min(0.25, (now - prev) / 1000) : 1 / 30;
		prev = now;
		const quad = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		const to = ([, f], w, h) => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, f);
			gl.viewport(0, 0, w, h);
		};
		const prog = (fs) => {
			const p = program(gl, fs);
			// biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram, not a React hook
			gl.useProgram(p);
			return (n) => uniform(gl, p, n);
		};

		// ---- 1: the light mask, every lit window at its place on screen (a = coverage) ----
		to(fb.M, MW, MH);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		let U = prog(COPY);
		gl.uniform1i(U("uSrc"), 0);
		const sx = MW / host.width,
			sy = MH / host.height;
		let glassLit = false;
		for (const tp of taps.values()) {
			const tex = tp.texture();
			if (!tex) continue;
			const r = tp.target.getBoundingClientRect();
			if (r.width < 1 || r.height < 1) continue;
			const x = (r.left - host.left) * sx,
				w = r.width * sx,
				h = r.height * sy,
				y = MH - (r.top - host.top) * sy - h;
			if (x > MW || y > MH || x + w < 0 || y + h < 0) continue;
			gl.viewport(
				Math.round(x),
				Math.round(y),
				Math.max(1, Math.round(w)),
				Math.max(1, Math.round(h)),
			);
			bind(gl, [tex]);
			quad();
			glassLit = true;
		}
		gl.disable(gl.BLEND);

		const [gn, pn, low] = gather(host);
		const lit = glassLit || pn > 0 || gn > 0;
		fade = reduce ? 1 : lit ? ease(fade, 1, 0.025, dt) : 0;
		// The floor line: given, or just under the lowest window.
		const fy = floorY ?? (low > 0 ? Math.min(0.98, low + 0.03) : 0.62);

		// ---- 2: each window's mean colour ----
		to(fb.A, MAX_GLASS, 1);
		U = prog(AVG);
		bind(gl, [fb.M[0]]);
		gl.uniform1i(U("uSrc"), 0);
		gl.uniform4fv(U("uG"), G);
		quad();

		// The light: above the top edge, set back so the shafts lean by `lean`.
		const ly = -rise;
		const lx = 0.5 - (lean * (0.35 - ly) * host.height) / host.width;
		const light = [lx, 1 - ly];

		// ---- 3, 4: god rays (long pass, then a short pass that fills its steps) ----
		const raysOn = L.rays > 0 || L.motes > 0;
		if (raysOn && glassLit) {
			to(fb.R1, MW, MH);
			U = prog(RAYS);
			bind(gl, [fb.M[0]]);
			gl.uniform1i(U("uSrc"), 0);
			gl.uniform2f(U("uL"), light[0], light[1]);
			gl.uniform1f(U("uReach"), B.rayReach);
			gl.uniform1f(U("uDecay"), B.rayDecay);
			gl.uniform1i(U("uN"), RAY_N);
			quad();
			to(fb.R2, MW, MH);
			bind(gl, [fb.R1[0]]);
			gl.uniform1f(U("uReach"), B.rayReach / RAY_N);
			gl.uniform1f(U("uDecay"), 1);
			gl.uniform1i(U("uN"), RAY_N2);
			quad();
		} else {
			to(fb.R2, MW, MH);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}

		// ---- 5: glass bloom source (threshold) at a quarter of the composite ----
		to(fb.B1, BW, BH);
		U = prog(DOWN);
		bind(gl, [fb.M[0]]);
		gl.uniform1i(U("uSrc"), 0);
		gl.uniform2f(U("uTexel"), 1 / MW, 1 / MH);
		gl.uniform1f(U("uTh"), B.bloomThreshold);
		gl.uniform1f(U("uKnee"), B.bloomKnee);
		quad();

		// ---- 6-9: two widening separable blurs ----
		U = prog(BLUR);
		gl.uniform1i(U("uSrc"), 0);
		const blur = (src, dst, dx, dy) => {
			to(dst, BW, BH);
			bind(gl, [src[0]]);
			gl.uniform2f(U("uDir"), dx / BW, dy / BH);
			quad();
		};
		blur(fb.B1, fb.B2, 1, 0);
		blur(fb.B2, fb.B1, 0, 1);
		blur(fb.B1, fb.B2, 2, 0);
		blur(fb.B2, fb.B1, 0, 2);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// ---- 10: compose onto the screen layer ----
		const g = L.grade;
		pass(canvas, () => {
			const C = prog(COMPOSE);
			bind(gl, [fb.R2[0], fb.B1[0], fb.M[0], fb.A[0]]);
			gl.uniform1i(C("uRays"), 0);
			gl.uniform1i(C("uBloom"), 1);
			gl.uniform1i(C("uMask"), 2);
			gl.uniform1i(C("uAvg"), 3);
			gl.uniform2f(C("uL"), light[0], light[1]);
			gl.uniform2f(C("uMaskTexel"), 1 / MW, 1 / MH);
			gl.uniform1f(C("uT"), t);
			gl.uniform1f(C("uFade"), fade);
			gl.uniform1f(C("uAspect"), host.width / host.height);
			gl.uniform1f(C("uPxH"), 1 / host.height);
			gl.uniform1f(C("uFloor"), 1 - fy);
			gl.uniform1f(C("uShimmer"), B.shimmer);
			// glass
			gl.uniform1f(C("uRaysK"), Math.min(L.rays, 1) * B.rays);
			gl.uniform1f(C("uBloomK"), L.bloom * B.bloom);
			gl.uniform1f(C("uOnGlass"), B.bloomOnGlass);
			gl.uniform1f(C("uRimK"), L.spill * B.rim);
			gl.uniform1f(C("uSpillK"), L.spill * B.spill);
			gl.uniform1f(C("uSpillDepth"), B.spillDepth);
			gl.uniform1f(C("uGlassHalo"), B.glassHalo / B.bloom);
			gl.uniform4fv(C("uG"), G);
			gl.uniform4fv(C("uGC"), GC);
			gl.uniform1fv(C("uGT"), GT);
			gl.uniform1i(C("uGN"), gn);
			// candles, embers, gilt (uBloomK carries B.bloom: the point gains divide it back out)
			const kb = 1 / B.bloom;
			gl.uniform1f(C("uCandleK"), L.candle);
			gl.uniform1f(C("uCore"), B.flameCore * kb);
			gl.uniform1f(C("uCoreR"), B.flameCoreR);
			gl.uniform1f(C("uHalo"), B.flameHalo * kb);
			gl.uniform1f(C("uHaloR"), B.flameHaloR);
			gl.uniform1f(C("uWall"), B.candleWall);
			gl.uniform1f(C("uFloorK"), B.candleFloor);
			gl.uniform1f(C("uReach"), B.candleReach);
			gl.uniform1f(C("uFlick"), reduce ? 0 : B.flicker);
			gl.uniform1f(C("uECore"), B.emberCore * kb);
			gl.uniform1f(C("uECoreR"), B.emberCoreR);
			gl.uniform1f(C("uESpill"), B.emberSpill * kb);
			gl.uniform1f(C("uGilt"), (reduce ? 0.35 : B.gilt) * kb);
			gl.uniform1f(C("uGiltRate"), B.giltRate);
			gl.uniform1f(C("uEmbK"), reduce ? 0 : L.embers);
			gl.uniform1f(C("uEmbRise"), B.emberRise);
			gl.uniform1f(C("uEmbLife"), B.emberLife);
			gl.uniform4fv(C("uP"), P);
			gl.uniform4fv(C("uPC"), PC);
			gl.uniform4fv(C("uPK"), PK);
			gl.uniform1i(C("uPN"), pn);
			// dust and grade
			gl.uniform1f(C("uMotesK"), reduce ? 0 : L.motes * B.motes);
			gl.uniform1f(C("uMoteCandle"), B.moteCandle);
			gl.uniform1f(C("uMoteDark"), B.moteDark);
			gl.uniform1f(C("uCell"), B.moteCell * k);
			gl.uniform1f(C("uRad"), Math.max(0.9, B.moteRadius * k));
			gl.uniform3f(C("uLift"), B.lift[0] * g, B.lift[1] * g, B.lift[2] * g);
			quad();
		});
	}

	size();
	scan();
	view = addView({
		targets: [canvas],
		live: () => !reduce && (taps.size > 0 || mine.length > 0),
		setup() {
			// A new context: the old framebuffers went with the old one.
			fb = null;
			fbDirty = true;
		},
		draw,
		dispose: free,
	});
	const timer = setInterval(scan, SCAN_MS);
	// An emitter came, went or changed: pick this scene's again (a still frame redraws).
	const unsub = onEmitters(() => {
		pick();
		view.invalidate();
	});
	const ro = new ResizeObserver(() => {
		size();
		view.invalidate();
	});
	ro.observe(canvas);

	return {
		set(next) {
			L = { ...next };
			view.invalidate();
		},
		setFloor(y) {
			if (y === floorY) return;
			floorY = y;
			view.invalidate();
		},
		destroy() {
			clearInterval(timer);
			unsub();
			ro.disconnect();
			for (const t of taps.values()) t.release();
			taps.clear();
			view.remove();
		},
	};
}
