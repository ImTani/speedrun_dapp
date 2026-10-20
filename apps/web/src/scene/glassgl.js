// WebGL2 stained glass: a window shader (hammered glass, refraction, backlight, seeds, beveled lead)
// and a caustics shader (window light pooling on the stone). All texture detail is procedural.
import { addView, bind, ease, lensReady, program, uniform } from "./lens.js";

(() => {
	const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n)); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= .5; } return s; }`;

	const WINDOW_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uCol, uLead, uLeadBlur, uGlow;
uniform vec2 uRes, uL; uniform float uT, uSwell, uDim, uRed, uCrack;
uniform float uHot, uAmb, uMoon, uLeak, uRim, uGrime, uBloom, uBloomGlass, uStreak, uRelief, uExpo;
uniform vec3 uCloud; // a cloud behind the glass: x centre (uv), amount, edge width
${NOISE}
float height(vec2 q){ return fbm(q + fbm(q * .45) * 1.6); }
// What sits behind the window: a dim night sky with slow cloud, and the moon (the draggable light).
// Radiance, linear. The glass filters this; it never shows unfiltered.
vec3 behind(vec2 p, float aspect){
  vec2 d = (p - uL) * vec2(aspect, 1.);
  float r2 = dot(d, d);
  vec3 sky = mix(vec3(.16, .17, .30), vec3(.30, .26, .34), p.y) * uAmb;
  sky *= .7 + .6 * vnoise(p * vec2(2.6, 5.) + vec2(uT * .012, 0.));
  float disc = smoothstep(.0105, .0055, r2);
  vec3 sun = vec3(1., .9, .74) * (uHot * exp(-r2 * 5.) + uHot * .72 * exp(-r2 * 34.) + uMoon * disc);
  // A lobed cloud mass travelling rigidly behind the glass; it swallows the sun and greys the sky it covers.
  vec2 cq = p - vec2(uCloud.x, .3);
  float cr = length(cq * vec2(1., 1.8)) + (fbm(cq * 3.5 + 11.) - .5) * .5;
  float cm = uCloud.y * smoothstep(.5, .5 - uCloud.z, cr);
  return sky * (1. - cm * .55) + sun * (1. - cm * .92);
}
void main(){
  vec4 base = texture(uCol, vUv);
  if (base.a < .02) { o = vec4(0); return; }
  float aspect = uRes.x / uRes.y;
  vec2 q = vUv * vec2(aspect, 1.) * 17.;
  float ht = height(q);
  float dx = height(q + vec2(.06, 0.)) - ht, dy = height(q + vec2(0., .06)) - ht;
  vec2 g = vec2(dx, dy) * uRelief;
  // Refraction through uneven glass, with slight chromatic split.
  vec2 off = g * .0045;
  // Fracture: radial breaks from the face outward plus a partial ring; shards refract out of line.
  vec2 cp = (vUv - vec2(.5, .6)) * vec2(aspect, 1.);
  float fcr = length(cp), fang = atan(cp.y, cp.x), seg = 6.2831 / 9.;
  float kk = floor(fang / seg + .5);
  float ad = (fract(fang / seg + .5 + (h21(vec2(kk, 3.)) - .5) * .3) - .5) * seg;
  float wob = (fbm(cp * 16.) - .5) * .014;
  float reach = uCrack * .62;
  float inside = step(fcr, reach) * step(.015, fcr);
  float dl = abs(ad) * fcr + wob;
  float crackLine = smoothstep(.0055, .0015, dl) * inside;
  float ring = smoothstep(.006, .0015, abs(fcr - .1 - .04 * h21(vec2(kk, 9.)))) * step(.11, reach) * step(.45, h21(vec2(kk, 5.)));
  float crack = max(crackLine, ring);
  float glint = smoothstep(.012, .004, dl) * (1. - crackLine) * inside;
  off += sign(ad) * vec2(.0035, -.002) * uCrack * inside;
  vec3 col = vec3(texture(uCol, vUv + off * 1.15).r, texture(uCol, vUv + off).g, texture(uCol, vUv + off * .85).b);
  vec3 alb = col * col;
  // Streaky cathedral glass: each pane (keyed by its jittered colour) gets its own swirl direction.
  float ps = h21(base.rg * 91.7 + base.b * 13.3);
  float an = ps * 3.1416, ca = cos(an), sa = sin(an);
  vec2 sq = mat2(ca, -sa, sa, ca) * q;
  float streak = fbm(vec2(sq.x * .16, sq.y * .9) + fbm(q * .28 + ps * 9.) * 2.4);
  // Thickness drives absorption (Beer-Lambert): thin streaks glow pale, thick ones go deep.
  float thick = clamp(1. + uStreak * (streak - .5) + .4 * (ht - .5) + (ps - .5) * .3, .62, 1.8);
  vec3 T = pow(alb, vec3(thick));
  // Thin, pale glass lets a little of the blurred view behind it through.
  float lum = dot(alb, vec3(.3, .5, .2));
  // Dark glass never lets the view through (keeps faces and deep panes from going muddy).
  float leak = uLeak * smoothstep(.9, .62, thick) * smoothstep(.015, .12, lum) * (.025 + .09 * lum);
  T = mix(T, vec3(1.), leak);
  vec3 L = behind(vUv + g * .02, aspect) * (1. + uSwell * .6) * (1. - uDim * .7) * mix(vec3(1.), vec3(1.5, .32, .38), uRed);
  vec3 rad = L * T;
  // Seeds: tiny trapped bubbles, in clustered seedy patches; each lenses light to a bright core.
  vec2 sc = q * 1.9, cell = floor(sc), fr = fract(sc) - .5;
  float pick = h21(cell) + .25 * vnoise(q * .35);
  if (pick > 1.02) {
    float b = length(fr - (h22(cell) - .5) * .6);
    rad *= 1. + smoothstep(.07, .02, b) * 1.6 - smoothstep(.09, .065, b) * smoothstep(.04, .065, b) * .55;
  }
  // Front surface: room candlelight glancing off the hammered relief.
  vec3 N = normalize(vec3(-g * 1.4, 1.));
  vec3 Ld = normalize(vec3(-.45, .55, .7));
  float spec = pow(max(dot(reflect(-Ld, N), vec3(0, 0, 1)), 0.), 24.) * .09;
  // Lead cames: rounded bevel from the blurred mask's gradient, dull matte metal.
  vec2 e = 1. / uRes;
  vec2 lg = vec2(texture(uLeadBlur, vUv + vec2(e.x * 1.5, 0)).r - texture(uLeadBlur, vUv - vec2(e.x * 1.5, 0)).r,
                 texture(uLeadBlur, vUv + vec2(0, e.y * 1.5)).r - texture(uLeadBlur, vUv - vec2(0, e.y * 1.5)).r);
  vec3 LN = normalize(vec3(-lg * 6., 1.));
  float lam = max(dot(LN, Ld), 0.);
  vec3 leadC = vec3(.035, .032, .04) + vec3(.26, .22, .17) * pow(lam, 6.) + vec3(.8, .7, .55) * pow(lam, 40.) * .22;
  float leadS = texture(uLead, vUv).r, leadB = texture(uLeadBlur, vUv).r;
  // Grime and putty darken glass where it meets the lead; just outside it, the thin edge catches light.
  float rim = smoothstep(.06, .2, leadB) * smoothstep(.42, .22, leadB);
  rad *= 1. - smoothstep(.25, .6, leadB) * uGrime;
  rad += L * sqrt(T) * rim * uRim;
  vec3 lit = sqrt(1. - exp(-rad * uExpo)) + spec;
  vec3 c = mix(lit, leadC, smoothstep(.3, .65, leadS));
  // Bloom: the brightest panes bleed soft light over the lead (blurred pane layer, lit by the same sky).
  vec4 gw = texture(uGlow, vUv);
  vec3 bl = gw.rgb * gw.rgb * gw.a * behind(vUv, aspect);
  vec3 bloom = 1. - exp(-max(bl - .12, 0.) * 1.6);
  c += bloom * uBloom * mix(uBloomGlass, 1., smoothstep(.2, .7, leadS));
  c = mix(c, vec3(.015, .012, .018), crack * .9) + vec3(1., .94, .82) * glint * .22 * (1. - uDim * .5);
  o = vec4(c * base.a, base.a);
}`;

	const CAUSTIC_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uBlur;
uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT, uGain, uReach, uFloor;
${NOISE}
// Caustic filaments: soft edges between slowly drifting Voronoi cells.
float caustic(vec2 p, float t){
  vec2 i = floor(p), f = fract(p); float f1 = 9., f2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 nb = vec2(x, y), pt = h22(i + nb);
    pt = .5 + .4 * sin(t + 6.2831 * pt);
    float dd = length(nb + pt - f);
    if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) { f2 = dd; }
  }
  return pow(1. - smoothstep(.0, .42, f2 - f1), 3.);
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x, vUv.y * uRes.y);
  float wb = uWin.y + uWin.w, cxw = uWin.x + uWin.z * .5;
  vec3 acc = vec3(0);
  float dy = p.y - wb;
  if (dy > -uWin.w * .04) {
    // Distance below the sill, in window heights. The pool spreads, dilutes and is gone well before the tabs.
    // Wall mode: distance below the sill. Floor mode: distance from the floor's edge, scaled by reach.
    float z = mix(max(dy, 0.), p.y, uFloor) / uWin.w / uReach;
    float spread = 1.1 + z * 1.6;
    float u = (p.x - cxw) / (uWin.z * spread) + .5 - (uL.x - .5) * z * .6;
    float v = mix(.96, .2, 1. - exp(-z * 1.8)) + (uL.y - .5) * .08;
    vec4 c = texture(uBlur, vec2(u, v));
    vec3 tint = c.rgb * c.rgb * c.a;
    // Brighter where the light sits behind the glass.
    vec2 ld = vec2(u, v) - uL;
    float src = .45 + .9 * exp(-dot(ld, ld) * 6.);
    float edge = smoothstep(-.05, .2, u) * smoothstep(1.05, .8, u);
    float lip = mix(smoothstep(-.04, .05, dy / uWin.w), smoothstep(0., .06, p.y / uWin.w), uFloor);
    float fall = exp(-z * 2.7) / spread * edge * lip * src;
    vec2 q = p / uWin.z * 4.2;
    q += vec2(fbm(q * .5 + uT * .02), fbm(q * .5 + 9. - uT * .017)) * 1.8;
    float cz = caustic(q + vec2(uT * .02, uT * .012), uT * .22);
    // Filaments only focus close to the sill; further out they blur into the wash.
    float fil = cz * exp(-z * 5.5);
    acc += tint * fall * (.3 + .3 * fil);
  }
  // Light bleeding past the frame onto the wall: barely there.
  vec2 rel = (p - vec2(cxw, uWin.y + uWin.w * .4)) / vec2(uWin.z * .95, uWin.w * .7);
  float halo = exp(-dot(rel, rel) * 1.8) * .022;
  acc += texture(uBlur, vec2(.5, .38)).rgb * halo;
  o = vec4(acc * uGain, 1.);
}`;

	/** Rasterise an SVG string to a canvas (optionally blurred) — the shader's input layers. */
	function raster(svg, w, h, blur = 0) {
		return new Promise((res, rej) => {
			const img = new Image();
			img.onload = () => {
				const c = document.createElement("canvas");
				c.width = w;
				c.height = h;
				const x = c.getContext("2d");
				if (blur) x.filter = `blur(${blur}px)`;
				x.drawImage(img, 0, 0, w, h);
				res(c);
			};
			img.onerror = rej;
			img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		});
	}

	// Look presets for the window. "now" reproduces the previous constants exactly.
	const PRESETS = {
		now: {
			hot: 1.25,
			amb: 1,
			moon: 1.1,
			leak: 1,
			rim: 0.32,
			grime: 0.45,
			bloom: 0.45,
			bloomGlass: 0.4,
			streak: 1.35,
			relief: 7,
			expo: 2.1,
		},
		earlier: {
			hot: 0.8,
			amb: 1.2,
			moon: 0,
			leak: 0,
			rim: 0,
			grime: 0.38,
			bloom: 0,
			bloomGlass: 0,
			streak: 0.3,
			relief: 7,
			expo: 2.4,
		},
		// Owner-tuned 2026-10-15 in the ?tune panel; the default look.
		locked: {
			hot: 1.12,
			amb: 0.36,
			moon: 0.15,
			leak: 0.3,
			rim: 0.1,
			grime: 0.57,
			bloom: 0.55,
			bloomGlass: 0.09,
			streak: 1.03,
			relief: 6.6,
			expo: 0.84,
		},
		cathedral: {
			hot: 0.4,
			amb: 1.7,
			moon: 0,
			leak: 0.35,
			rim: 0,
			grime: 0.3,
			bloom: 0.35,
			bloomGlass: 0,
			streak: 1.1,
			relief: 6,
			expo: 2.2,
		},
	};
	const UNIFORM = {
		hot: "uHot",
		amb: "uAmb",
		moon: "uMoon",
		leak: "uLeak",
		rim: "uRim",
		grime: "uGrime",
		bloom: "uBloom",
		bloomGlass: "uBloomGlass",
		streak: "uStreak",
		relief: "uRelief",
		expo: "uExpo",
	};

	/**
	 * Mount the lit window into `winCanvas` and its light onto `causticCanvas`, both drawn through
	 * the shared lens (lens.js): the canvases take 2D frames, never a WebGL context of their own.
	 * Returns the window's controls, or null when WebGL2 is unavailable (caller keeps the SVG).
	 */
	async function mount({
		winCanvas,
		causticCanvas,
		theme = "vesper",
		seed = 13,
		preset = "locked",
		causticBoost = 1,
		causticReach = 1,
		causticFloor = false,
	}) {
		const params = { ...PRESETS[preset] };
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		if (!lensReady(WINDOW_FRAG, ...(causticCanvas ? [CAUSTIC_FRAG] : [])))
			return null;
		if (!winCanvas.getContext("2d")) return null;
		if (causticCanvas && !causticCanvas.getContext("2d")) return null;
		const cw = winCanvas.clientWidth,
			ch = winCanvas.clientHeight;
		winCanvas.width = Math.round(cw * dpr);
		winCanvas.height = Math.round(ch * dpr);

		const W = winCanvas.width,
			H = winCanvas.height;
		const opts = { theme, seed, width: W };
		const [col, lead, leadBlur] = await Promise.all([
			raster(window.G.windowSVG({ ...opts, mode: "color" }), W, H),
			raster(window.G.windowSVG({ ...opts, mode: "lead" }), W, H),
			raster(
				window.G.windowSVG({ ...opts, mode: "lead" }),
				W,
				H,
				2.2 * dpr,
			) /* sharper bevel (owner, 2026-10-15) */,
		]);
		const colBlur = await raster(
			window.G.windowSVG({ ...opts, mode: "color", width: 150 }),
			150,
			210,
			9,
		);
		// Bloom source: panes without lead, quarter resolution, blurred about 7 CSS px.
		const glow = await raster(
			window.G.windowSVG({ ...opts, mode: "glow", width: W >> 2 }),
			W >> 2,
			H >> 2,
			1.8 * dpr,
		);
		if (causticCanvas) {
			const cscale = 0.5; // caustics are soft: half resolution is plenty
			causticCanvas.width = Math.round(
				causticCanvas.clientWidth * dpr * cscale,
			);
			causticCanvas.height = Math.round(
				causticCanvas.clientHeight * dpr * cscale,
			);
		}

		const cloud = [-9, 0, 0.08];
		let dim = 0,
			dimTarget = 0,
			red = 0,
			redTarget = 0,
			gain = 1,
			crk = 0,
			crkTarget = 0;
		let light = [0.5, 0.36],
			target = [0.5, 0.36],
			swellT = -9,
			dragging = false,
			prev = 0;
		const t0 = performance.now();
		const winRect = () => {
			const a = winCanvas.getBoundingClientRect(),
				b = causticCanvas.getBoundingClientRect();
			const s = causticCanvas.width / b.width;
			return [
				(a.left - b.left) * s,
				(a.top - b.top) * s,
				a.width * s,
				a.height * s,
			];
		};
		let winTex = [],
			blurTex = null;
		function frame(gl, now, pass) {
			const t = (now - t0) / 1000;
			// The study eased per 60 fps frame; scale each ease to the step actually taken.
			const dt = prev ? Math.min(0.25, (now - prev) / 1000) : 1 / 30;
			prev = now;
			const e = (cur, to, k) => (reduce ? to : ease(cur, to, k, dt));
			if (!dragging && !reduce)
				target = [
					0.5 + Math.sin(t * 0.23) * 0.1,
					0.36 + Math.sin(t * 0.17) * 0.05,
				];
			light = [e(light[0], target[0], 0.08), e(light[1], target[1], 0.08)];
			const sw =
				Math.max(0, 1 - (t - swellT) / 1.1) * Math.min(1, (t - swellT) * 6);
			dim = e(dim, dimTarget, 0.07);
			red = e(red, redTarget, 0.09);
			crk = e(crk, crkTarget, 0.12);
			pass(winCanvas, () => {
				const p = program(gl, WINDOW_FRAG);
				const U = (n) => uniform(gl, p, n);
				gl.useProgram(p);
				bind(gl, winTex);
				gl.uniform1i(U("uCol"), 0);
				gl.uniform1i(U("uLead"), 1);
				gl.uniform1i(U("uLeadBlur"), 2);
				gl.uniform1i(U("uGlow"), 3);
				gl.uniform2f(U("uRes"), W, H);
				gl.uniform2f(U("uL"), light[0], light[1]);
				gl.uniform1f(U("uT"), t);
				gl.uniform1f(U("uSwell"), sw);
				gl.uniform1f(U("uDim"), dim);
				gl.uniform1f(U("uRed"), red);
				gl.uniform1f(U("uCrack"), crk);
				gl.uniform3f(U("uCloud"), cloud[0], cloud[1], cloud[2]);
				for (const [k, u] of Object.entries(UNIFORM))
					gl.uniform1f(U(u), params[k]);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			});
			if (!causticCanvas) return;
			gain = e(gain, (1 + sw * 1.4) * (1 - dim * 0.85) * (1 + red * 0.3), 0.1);
			pass(causticCanvas, () => {
				const p = program(gl, CAUSTIC_FRAG);
				const C = (n) => uniform(gl, p, n);
				gl.useProgram(p);
				bind(gl, [blurTex]);
				gl.uniform1i(C("uBlur"), 0);
				gl.uniform2f(C("uRes"), causticCanvas.width, causticCanvas.height);
				gl.uniform2f(C("uL"), light[0], light[1]);
				gl.uniform4f(C("uWin"), ...winRect());
				gl.uniform1f(C("uT"), reduce ? 0 : t);
				gl.uniform1f(C("uGain"), gain * causticBoost);
				gl.uniform1f(C("uReach"), causticReach);
				gl.uniform1f(C("uFloor"), causticFloor ? 1 : 0);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			});
		}
		// Lit glass is a light source: the atmosphere (atmosgl.js) finds it by this mark.
		winCanvas.dataset.lensGlass = "";
		const view = addView({
			targets: causticCanvas ? [winCanvas, causticCanvas] : [winCanvas],
			live: !reduce,
			setup(_gl, texture) {
				winTex = [col, lead, leadBlur, glow].map(texture);
				blurTex = causticCanvas ? texture(colBlur) : null;
			},
			draw: frame,
		});
		// Reduced motion draws a still frame; a change of look draws it again.
		const poke = () => {
			if (reduce) view.invalidate();
		};

		// Drag across the window to move the light behind it.
		const ac = new AbortController();
		const on = { signal: ac.signal };
		winCanvas.addEventListener(
			"pointerdown",
			(e) => {
				dragging = true;
				winCanvas.setPointerCapture(e.pointerId);
				move(e);
			},
			on,
		);
		winCanvas.addEventListener("pointermove", (e) => dragging && move(e), on);
		for (const n of ["pointerup", "pointercancel"])
			winCanvas.addEventListener(
				n,
				() => {
					dragging = false;
				},
				on,
			);
		function move(e) {
			const r = winCanvas.getBoundingClientRect();
			target = [
				Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width)),
				Math.min(0.9, Math.max(0.1, (e.clientY - r.top) / r.height)),
			];
			poke();
		}
		return {
			params,
			dim(v) {
				if (v === dimTarget) return;
				dimTarget = v;
				poke();
			},
			red(v) {
				if (v === redTarget) return;
				redTarget = v;
				poke();
			},
			crack(v) {
				if (v === crkTarget) return;
				crkTarget = v;
				poke();
			},
			cloud(x, amount = 1) {
				if (cloud[0] === x && cloud[1] === amount) return;
				cloud[0] = x;
				cloud[1] = amount;
				poke();
			},
			set(k, v) {
				params[k] = v;
				view.invalidate();
			},
			swell() {
				swellT = (performance.now() - t0) / 1000;
				poke();
			},
			destroy() {
				ac.abort();
				delete winCanvas.dataset.lensGlass;
				view.remove();
			},
		};
	}

	window.GL = { mount, PRESETS, WINDOW_FRAG, raster };
})();

export const GL = window.GL;
