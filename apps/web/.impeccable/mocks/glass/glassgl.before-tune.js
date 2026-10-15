// WebGL2 stained glass: a window shader (hammered glass, refraction, backlight, seeds, beveled lead)
// and a caustics shader (window light pooling on the stone). All texture detail is procedural.
(() => {
	const VERT = `#version 300 es
in vec2 aP; out vec2 vUv;
void main(){ vUv = aP * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aP, 0., 1.); }`;

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
uniform vec2 uRes, uL; uniform float uT, uSwell;
${NOISE}
float height(vec2 q){ return fbm(q + fbm(q * .45) * 1.6); }
// What sits behind the window: a dim night sky with slow cloud, and the moon (the draggable light).
// Radiance, linear. The glass filters this; it never shows unfiltered.
vec3 behind(vec2 p, float aspect){
  vec2 d = (p - uL) * vec2(aspect, 1.);
  float r2 = dot(d, d);
  vec3 sky = mix(vec3(.16, .17, .30), vec3(.30, .26, .34), p.y);
  sky *= .7 + .6 * vnoise(p * vec2(2.6, 5.) + vec2(uT * .012, 0.));
  float disc = smoothstep(.0105, .0055, r2);
  return sky + vec3(1., .9, .74) * (1.25 * exp(-r2 * 5.) + .9 * exp(-r2 * 34.) + 1.1 * disc);
}
void main(){
  vec4 base = texture(uCol, vUv);
  if (base.a < .02) { o = vec4(0); return; }
  float aspect = uRes.x / uRes.y;
  vec2 q = vUv * vec2(aspect, 1.) * 17.;
  float ht = height(q);
  float dx = height(q + vec2(.06, 0.)) - ht, dy = height(q + vec2(0., .06)) - ht;
  vec2 g = vec2(dx, dy) * 7.;
  // Refraction through uneven glass, with slight chromatic split.
  vec2 off = g * .0045;
  vec3 col = vec3(texture(uCol, vUv + off * 1.15).r, texture(uCol, vUv + off).g, texture(uCol, vUv + off * .85).b);
  vec3 alb = col * col;
  // Streaky cathedral glass: each pane (keyed by its jittered colour) gets its own swirl direction.
  float ps = h21(base.rg * 91.7 + base.b * 13.3);
  float an = ps * 3.1416, ca = cos(an), sa = sin(an);
  vec2 sq = mat2(ca, -sa, sa, ca) * q;
  float streak = fbm(vec2(sq.x * .16, sq.y * .9) + fbm(q * .28 + ps * 9.) * 2.4);
  // Thickness drives absorption (Beer-Lambert): thin streaks glow pale, thick ones go deep.
  float thick = clamp(1. + 1.35 * (streak - .5) + .4 * (ht - .5) + (ps - .5) * .3, .62, 1.8);
  vec3 T = pow(alb, vec3(thick));
  // Thin, pale glass lets a little of the blurred view behind it through.
  float leak = smoothstep(.9, .62, thick) * (.025 + .09 * dot(alb, vec3(.3, .5, .2)));
  T = mix(T, vec3(1.), leak);
  vec3 L = behind(vUv + g * .02, aspect) * (1. + uSwell * .6);
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
  rad *= 1. - smoothstep(.25, .6, leadB) * .45;
  rad += L * sqrt(T) * rim * .32;
  vec3 lit = sqrt(1. - exp(-rad * 2.1)) + spec;
  vec3 c = mix(lit, leadC, smoothstep(.3, .65, leadS));
  // Bloom: the brightest panes bleed soft light over the lead (blurred pane layer, lit by the same sky).
  vec4 gw = texture(uGlow, vUv);
  vec3 bl = gw.rgb * gw.rgb * gw.a * behind(vUv, aspect);
  vec3 bloom = 1. - exp(-max(bl - .12, 0.) * 1.6);
  c += bloom * mix(.18, .45, smoothstep(.2, .7, leadS));
  o = vec4(c * base.a, base.a);
}`;

	const CAUSTIC_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uBlur;
uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT;
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
    float z = max(dy, 0.) / uWin.w;
    float spread = 1.1 + z * 1.6;
    float u = (p.x - cxw) / (uWin.z * spread) + .5 - (uL.x - .5) * z * .6;
    float v = mix(.96, .2, 1. - exp(-z * 1.8)) + (uL.y - .5) * .08;
    vec4 c = texture(uBlur, vec2(u, v));
    vec3 tint = c.rgb * c.rgb * c.a;
    // Brighter where the light sits behind the glass.
    vec2 ld = vec2(u, v) - uL;
    float src = .45 + .9 * exp(-dot(ld, ld) * 6.);
    float edge = smoothstep(-.05, .2, u) * smoothstep(1.05, .8, u);
    float lip = smoothstep(-.04, .05, dy / uWin.w);
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
  o = vec4(acc, 1.);
}`;

	function compile(gl, vs, fs) {
		const sh = (type, src) => {
			const s = gl.createShader(type);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
			return s;
		};
		const p = gl.createProgram();
		gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
		gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
		return p;
	}
	function quad(gl, prog) {
		const b = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, b);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(prog, "aP");
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
	}
	function texture(gl, unit, source) {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return t;
	}

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

	/**
	 * Mount the lit window into `winCanvas` and its light onto `causticCanvas`.
	 * Returns { swell(), setLight(u,v) } or null when WebGL2 is unavailable (caller keeps the SVG).
	 */
	async function mount({ winCanvas, causticCanvas, theme = "vesper", seed = 13 }) {
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cw = winCanvas.clientWidth, ch = winCanvas.clientHeight;
		winCanvas.width = Math.round(cw * dpr);
		winCanvas.height = Math.round(ch * dpr);
		const gl = winCanvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
		const gl2 = causticCanvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
		if (!gl || !gl2) return null;

		const W = winCanvas.width, H = winCanvas.height;
		const opts = { theme, seed, width: W };
		const [col, lead, leadBlur] = await Promise.all([
			raster(window.G.windowSVG({ ...opts, mode: "color" }), W, H),
			raster(window.G.windowSVG({ ...opts, mode: "lead" }), W, H),
			raster(window.G.windowSVG({ ...opts, mode: "lead" }), W, H, 3 * dpr),
		]);
		const colBlur = await raster(window.G.windowSVG({ ...opts, mode: "color", width: 150 }), 150, 210, 9);
		// Bloom source: panes without lead, quarter resolution, blurred about 7 CSS px.
		const glow = await raster(window.G.windowSVG({ ...opts, mode: "glow", width: W >> 2 }), W >> 2, H >> 2, 1.8 * dpr);

		const pw = compile(gl, VERT, WINDOW_FRAG);
		gl.useProgram(pw);
		quad(gl, pw);
		texture(gl, 0, col);
		texture(gl, 1, lead);
		texture(gl, 2, leadBlur);
		texture(gl, 3, glow);
		gl.uniform1i(gl.getUniformLocation(pw, "uCol"), 0);
		gl.uniform1i(gl.getUniformLocation(pw, "uLead"), 1);
		gl.uniform1i(gl.getUniformLocation(pw, "uLeadBlur"), 2);
		gl.uniform1i(gl.getUniformLocation(pw, "uGlow"), 3);
		const U = (n) => gl.getUniformLocation(pw, n);

		const cscale = 0.5; // caustics are soft: half resolution is plenty
		causticCanvas.width = Math.round(causticCanvas.clientWidth * dpr * cscale);
		causticCanvas.height = Math.round(causticCanvas.clientHeight * dpr * cscale);
		const pc = compile(gl2, VERT, CAUSTIC_FRAG);
		gl2.useProgram(pc);
		quad(gl2, pc);
		texture(gl2, 0, colBlur);
		gl2.uniform1i(gl2.getUniformLocation(pc, "uBlur"), 0);
		const C = (n) => gl2.getUniformLocation(pc, n);

		let light = [0.5, 0.36], target = [0.5, 0.36], swellT = -9, dragging = false, running = true;
		const t0 = performance.now();
		const winRect = () => {
			const a = winCanvas.getBoundingClientRect(), b = causticCanvas.getBoundingClientRect();
			const s = causticCanvas.width / b.width;
			return [(a.left - b.left) * s, (a.top - b.top) * s, a.width * s, a.height * s];
		};
		function frame(now) {
			if (!running) return;
			const t = (now - t0) / 1000;
			if (!dragging && !reduce) target = [0.5 + Math.sin(t * 0.23) * 0.1, 0.36 + Math.sin(t * 0.17) * 0.05];
			light = [light[0] + (target[0] - light[0]) * 0.08, light[1] + (target[1] - light[1]) * 0.08];
			const sw = Math.max(0, 1 - (t - swellT) / 1.1) * Math.min(1, (t - swellT) * 6);
			gl.viewport(0, 0, W, H);
			gl.uniform2f(U("uRes"), W, H);
			gl.uniform2f(U("uL"), light[0], light[1]);
			gl.uniform1f(U("uT"), t);
			gl.uniform1f(U("uSwell"), sw);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl2.viewport(0, 0, causticCanvas.width, causticCanvas.height);
			gl2.uniform2f(C("uRes"), causticCanvas.width, causticCanvas.height);
			gl2.uniform2f(C("uL"), light[0], light[1]);
			gl2.uniform4f(C("uWin"), ...winRect());
			gl2.uniform1f(C("uT"), reduce ? 0 : t);
			gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);
			if (!reduce) requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
		document.addEventListener("visibilitychange", () => {
			running = !document.hidden;
			if (running) requestAnimationFrame(frame);
		});

		// Drag across the window to move the light behind it.
		winCanvas.addEventListener("pointerdown", (e) => { dragging = true; winCanvas.setPointerCapture(e.pointerId); move(e); });
		winCanvas.addEventListener("pointermove", (e) => dragging && move(e));
		["pointerup", "pointercancel"].forEach((n) => winCanvas.addEventListener(n, () => { dragging = false; }));
		function move(e) {
			const r = winCanvas.getBoundingClientRect();
			target = [Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width)), Math.min(0.9, Math.max(0.1, (e.clientY - r.top) / r.height))];
		}
		return {
			swell() { swellT = (performance.now() - t0) / 1000; if (reduce) requestAnimationFrame(frame); },
		};
	}

	window.GL = { mount };
})();
