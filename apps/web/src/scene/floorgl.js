// Floor light for the Gathering: each window's glass projected onto the marble as caustic light,
// computed on the floor plane (so the pattern foreshortens with depth). Pools can swell, meet at the
// crossing, turn crimson, and one pool's light can be drawn across the stone into the other's.
import { addView, bind, lensReady, program, uniform } from "./lens.js";

(() => {
	const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uA, uB;            // blurred colour of window A (left) and B (right)
uniform vec2 uRes;                   // floor size in css px
uniform float uT, uZf, uVX;          // time, far depth, vanishing x
uniform vec4 uPA, uPB;               // pool: world X centre, intensity, spread, crimson
uniform vec4 uDrain;                 // from (0 = A, 1 = B), amount, travel phase, 0
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n)); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 4; k++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
// Caustic network: sharpened edges between drifting cells, domain-warped so they curl like real light.
float caus(vec2 p, float t){
  p += vec2(fbm(p * .55 + t * .05), fbm(p * .55 + 4.3 - t * .04)) * 1.6;
  vec2 i = floor(p), f = fract(p); float f1 = 9., f2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 nb = vec2(x, y), pt = .5 + .45 * sin(t * .7 + 6.2831 * h22(i + nb));
    float d = length(nb + pt - f);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
  }
  return pow(1. - smoothstep(0., .32, f2 - f1), 2.2);
}
uniform float uZC, uRZ, uSpread, uCaus;  // where the pools land, how deep, how divergent, filament strength
vec3 tint(sampler2D s, vec2 uv){ vec4 c = texture(s, clamp(uv, vec2(.02), vec2(.98))); return c.rgb * c.rgb * c.a; }
vec3 crimson(vec3 c, float k){ float l = dot(c, vec3(.3, .5, .2)); return mix(c, vec3(1., .1, .14) * (l * 1.6 + .04), k); }
vec3 pool(sampler2D s, vec4 P, float X, float Z, float t, out float mask){
  float rx = 290. * P.z * uSpread, dx = (X - P.x) / rx, dz = (Z - uZC) / uRZ;
  mask = exp(-(dx * dx * 1.7 + dz * dz * 2.1));
  // Where on the window this patch of floor sees: window bottom lands by the wall, its top lands nearest you.
  vec2 uv = vec2(.5 + dx * .48, mix(.96, .14, clamp((uZC + uRZ - Z) / (2. * uRZ), 0., 1.)));
  vec3 c = crimson(tint(s, uv), P.w);
  vec2 q = vec2(X / 70., Z * 2.3);
  float cz = caus(q, t) + .55 * caus(q * 1.7 + 3.1, t * 1.3);
  return c * P.y * mask * (.55 + uCaus * cz);
}
void main(){
  vec2 sp = vUv * uRes;
  float invZ = sp.y / uRes.y * (1. - 1. / uZf) + 1. / uZf, Z = 1. / invZ;
  float X = uVX + (sp.x - uVX) * Z;
  float t = uT;
  float mA, mB;
  vec3 acc = pool(uA, uPA, X, Z, t, mA) + pool(uB, uPB, X, Z, t + 17., mB);
  // Drain: light drawn across the stone from one pool to the other, streaming filaments along the path.
  if (uDrain.y > .001) {
    vec4 F = uDrain.x < .5 ? uPA : uPB, D = uDrain.x < .5 ? uPB : uPA;
    float dir = sign(D.x - F.x), len = abs(D.x - F.x);
    float along = (X - F.x) * dir / len;                       // 0 at victim, 1 at devourer
    float perp = (Z - uZC) / (uRZ * .55);
    float band = exp(-perp * perp * 2.2) * smoothstep(-.12, .12, along) * smoothstep(1.12, .88, along);
    vec2 q = vec2(along * 9. - uDrain.z * 2.4, perp * 1.6 + fbm(vec2(along * 3., uT * .3)) * .8);
    float flow = caus(q, t * 1.6) + .5 * caus(q * 1.9 + 7., t * 2.);
    vec3 src = uDrain.x < .5 ? tint(uA, vec2(.5, .5)) : tint(uB, vec2(.5, .5));
    vec3 col = crimson(src * 1.6 + .02, smoothstep(.15, .85, along));
    acc += col * band * uDrain.y * (.15 + 1.25 * flow) * (.6 + .4 * sin(along * 3.1416));
  }
  // Distance haze: light thins toward the viewer and near the floor's far edge.
  acc *= smoothstep(1.02, 1.25, Z) * (1. - smoothstep(3.8, 4., Z) * .5);
  o = vec4(1. - exp(-acc * 1.45), 1.);
}`;

	function raster(svg, w, h, blur) {
		return new Promise((res, rej) => {
			const img = new Image();
			img.onload = () => {
				const c = document.createElement("canvas");
				c.width = w;
				c.height = h;
				const x = c.getContext("2d");
				x.filter = `blur(${blur}px)`;
				x.drawImage(img, 0, 0, w, h);
				res(c);
			};
			img.onerror = rej;
			img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		});
	}

	/**
	 * mount({ canvas, a: {theme, seed}, b: {theme, seed}, zf, vx, state })
	 * state is read every frame: { A: {x, i, r, c}, B: {...}, drain: {from, amount, phase} } (world units).
	 * Drawn through the shared lens (lens.js) at its 30 fps. Under reduced motion time stands still
	 * and a frame is drawn only when the pools move.
	 */
	async function mount({ canvas, a, b, zf = 4, vx = 195, state }) {
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!lensReady(FRAG) || !canvas.getContext("2d")) return null;
		const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75;
		canvas.width = Math.round(canvas.clientWidth * scale);
		canvas.height = Math.round(canvas.clientHeight * scale);
		const [ra, rb] = await Promise.all(
			[a, b].map((w) =>
				raster(
					window.G.windowSVG({ ...w, mode: "color", width: 150 }),
					150,
					210,
					7,
				),
			),
		);
		const t0 = performance.now();
		let tex = [];
		let drawn = "";
		const view = addView({
			targets: [canvas],
			live: true,
			setup(_gl, texture) {
				tex = [texture(ra), texture(rb)];
				drawn = "";
			},
			draw(gl, now, pass) {
				const { A, B, drain } = state;
				const L = state.look;
				if (reduce) {
					const sig = [
						A.x,
						A.i,
						A.r,
						A.c,
						B.x,
						B.i,
						B.r,
						B.c,
						drain.from,
						drain.amount,
						L.zc,
						L.rz,
						L.spread,
						L.caus,
						canvas.width,
						canvas.height,
					].join();
					if (sig === drawn) return;
					drawn = sig;
				}
				const t = reduce ? 4 : (now - t0) / 1000;
				pass(canvas, () => {
					const p = program(gl, FRAG);
					const U = (n) => uniform(gl, p, n);
					gl.useProgram(p);
					bind(gl, tex);
					gl.uniform1i(U("uA"), 0);
					gl.uniform1i(U("uB"), 1);
					gl.uniform2f(U("uRes"), canvas.clientWidth, canvas.clientHeight);
					gl.uniform1f(U("uT"), t);
					gl.uniform1f(U("uZf"), zf);
					gl.uniform1f(U("uVX"), vx);
					gl.uniform4f(U("uPA"), A.x, A.i, A.r, A.c);
					gl.uniform4f(U("uPB"), B.x, B.i, B.r, B.c);
					gl.uniform4f(
						U("uDrain"),
						drain.from,
						drain.amount,
						reduce ? 0 : drain.phase,
						0,
					);
					gl.uniform1f(U("uZC"), L.zc);
					gl.uniform1f(U("uRZ"), L.rz);
					gl.uniform1f(U("uSpread"), L.spread);
					gl.uniform1f(U("uCaus"), L.caus);
					gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				});
			},
		});
		return {
			stop() {
				view.remove();
			},
		};
	}
	window.FLOOR = { mount };
})();

export const FLOOR = window.FLOOR;
