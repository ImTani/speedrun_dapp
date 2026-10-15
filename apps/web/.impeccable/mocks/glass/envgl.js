// The Gathering's environment as a dark oil painting: compose wall + floor, light it chiaroscuro
// (only the windows and candles give light), Kuwahara-filter it once into brushwork, then grade it
// every frame with vignette, canvas grain and a few subtly wrong things: eyes that open in the dark,
// and an inlaid eye on the floor that opens when something devours.
(() => {
	const VERT = `#version 300 es
in vec2 aP; out vec2 vUv;
void main(){ vUv = aP * .5 + .5; gl_Position = vec4(aP, 0., 1.); }`;

	// Classic 4-quadrant Kuwahara: each pixel takes the mean of its least-varied neighbouring quadrant,
	// flattening texture into paint patches while keeping edges.
	const KUWA = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel;
const int R = 5;
void main(){
  vec3 m[4]; vec3 s[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0); s[k] = vec3(0); }
  vec2 dirs[4] = vec2[4](vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(1, 1));
  float n = float((R + 1) * (R + 1));
  for (int k = 0; k < 4; k++) {
    for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
      vec3 c = texture(uSrc, vUv + dirs[k] * vec2(i, j) * uTexel).rgb;
      m[k] += c; s[k] += c * c;
    }
  }
  float best = 1e9; vec3 outc = vec3(0);
  for (int k = 0; k < 4; k++) {
    vec3 mu = m[k] / n, va = abs(s[k] / n - mu * mu);
    float v = va.r + va.g + va.b;
    if (v < best) { best = v; outc = mu; }
  }
  o = vec4(outc, 1.);
}`;

	const GRADE = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPaint; uniform vec2 uRes; uniform float uT, uEye, uExpo, uVig;
uniform vec4 uEyes[8];        // x, y (css px), phase, period
uniform vec2 uFloorEye;       // css px centre of the inlaid floor eye
float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec2 px = vec2(vUv.x, 1. - vUv.y) * uRes;
  vec3 c = texture(uPaint, vUv).rgb;
  // Grade: crush toward violet-black, keep warm light warm, lose saturation in the dark.
  float l = dot(c, vec3(.3, .55, .15));
  c = mix(vec3(l), c, smoothstep(.02, .35, l) * .85 + .1);
  c = pow(c, vec3(1.18)) * 1.12 + vec3(.014, .01, .022);
  c *= vec3(1.04, .96, .92);
  // Canvas: woven tooth and a slow-moving grain.
  c *= uExpo;
  // Vignette, heavier at the top where the vault swallows the light.
  vec2 q = vUv - vec2(.5, .48);
  c *= mix(1., smoothstep(.95, .25, length(q * vec2(1.25, 1.))), uVig);
  // Eyes in the dark: they open rarely, hold, sometimes blink, and close.
  for (int i = 0; i < 8; i++) {
    vec4 E = uEyes[i]; if (E.w <= 0.) continue;
    float s = .5 + .5 * sin((uT + E.z) * 6.2831 / E.w);
    float open = smoothstep(.82, .97, s) * (1. - step(fract((uT + E.z * 3.1) / 5.3), .035));
    vec2 d1 = px - E.xy - vec2(-3.2, 0.), d2 = px - E.xy - vec2(3.2, 0.);
    float g = exp(-dot(d1 * vec2(1., 2.2), d1 * vec2(1., 2.2)) * .55) + exp(-dot(d2 * vec2(1., 2.2), d2 * vec2(1., 2.2)) * .55);
    float halo = exp(-dot(px - E.xy, px - E.xy) * .012) * .08;
    c += vec3(.9, .28, .16) * (g * .75 + halo) * open;
  }
  // The inlaid eye at the crossing: closed brass lids that part when something devours.
  vec2 e = (px - uFloorEye) / vec2(30., 9.);
  float lid = 1. - e.x * e.x;
  float inside = step(abs(e.x), 1.) * step(abs(e.y), lid * uEye);
  float iris = exp(-dot(e * vec2(1., 3.), e * vec2(1., 3.)) * 2.5);
  c = mix(c, vec3(.05, .01, .015), inside * .8);
  c += vec3(.95, .22, .1) * iris * inside * 1.3;
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

	function compile(gl, vs, fs) {
		const sh = (t, src) => {
			const s = gl.createShader(t);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
				throw new Error(gl.getShaderInfoLog(s));
			return s;
		};
		const p = gl.createProgram();
		gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
		gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS))
			throw new Error(gl.getProgramInfoLog(p));
		return p;
	}
	function svgImage(svg) {
		return new Promise((res, rej) => {
			const i = new Image();
			i.onload = () => res(i);
			i.onerror = rej;
			i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		});
	}

	/**
	 * mount({ canvas, wallSVG, floorCanvas, lights, eyes, floorEye })
	 *   lights: [{x, y, r, color:[r,g,b], a}] in css px — what the windows and candles illuminate.
	 *   eyes: up to 8 {x, y, phase, period}; floorEye: {x, y}.
	 * Returns { eye(v) } to open the floor eye (0 closed … 1 open), or null without WebGL2.
	 */
	async function mount({
		canvas,
		wallSVG,
		floorCanvas,
		floorTop,
		lights,
		eyes,
		floorEye,
		look = { expo: 1, vig: 1 },
	}) {
		const W = 390,
			H = 844,
			reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const gl = canvas.getContext("webgl2", { antialias: false });
		if (!gl) return null;
		// 1. Compose the scene at 1 css px per texel (Kuwahara softens it into paint anyway).
		const comp = document.createElement("canvas");
		comp.width = W;
		comp.height = H;
		const x = comp.getContext("2d");
		x.fillStyle = "#0d0b10";
		x.fillRect(0, 0, W, H);
		x.drawImage(await svgImage(wallSVG), 0, 0);
		x.drawImage(floorCanvas, 0, floorTop, W, H - floorTop);
		// 2. Chiaroscuro: the scene receives only ambient dark plus the light its sources throw.
		const lm = document.createElement("canvas");
		lm.width = W;
		lm.height = H;
		const lx = lm.getContext("2d");
		lx.fillStyle = "rgb(78,70,86)";
		lx.fillRect(0, 0, W, H);
		lx.globalCompositeOperation = "lighter";
		for (const L of lights) {
			const g = lx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
			g.addColorStop(0, `rgba(${L.color},${L.a})`);
			g.addColorStop(1, `rgba(${L.color},0)`);
			lx.fillStyle = g;
			lx.fillRect(0, 0, W, H);
		}
		x.globalCompositeOperation = "multiply";
		x.drawImage(lm, 0, 0);
		x.globalCompositeOperation = "source-over";
		// 3. Kuwahara once into a texture.
		const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75;
		canvas.width = Math.round(W * scale);
		canvas.height = Math.round(H * scale);
		const quad = (p) => {
			const b = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, b);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
				gl.STATIC_DRAW,
			);
			const l = gl.getAttribLocation(p, "aP");
			gl.enableVertexAttribArray(l);
			gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
		};
		const mkTex = (w, h, src) => {
			const t = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, t);
			if (src) {
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					src,
				);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			} else
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					w,
					h,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null,
				);
			for (const [k, v] of [
				[gl.TEXTURE_MIN_FILTER, gl.LINEAR],
				[gl.TEXTURE_MAG_FILTER, gl.LINEAR],
				[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
				[gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
			])
				gl.texParameteri(gl.TEXTURE_2D, k, v);
			return t;
		};
		const src = mkTex(W, H, comp),
			painted = mkTex(W, H, null);
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			painted,
			0,
		);
		const pk = compile(gl, VERT, KUWA);
		gl.useProgram(pk);
		quad(pk);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, src);
		gl.uniform1i(gl.getUniformLocation(pk, "uSrc"), 0);
		gl.uniform2f(gl.getUniformLocation(pk, "uTexel"), 1 / W, 1 / H);
		gl.viewport(0, 0, W, H);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// 4. Grade every frame.
		const pg = compile(gl, VERT, GRADE);
		gl.useProgram(pg);
		quad(pg);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, painted);
		const U = (n) => gl.getUniformLocation(pg, n);
		gl.uniform1i(U("uPaint"), 0);
		gl.uniform2f(U("uRes"), W, H);
		const flat = new Float32Array(32);
		eyes
			.slice(0, 8)
			.forEach((e, i) => flat.set([e.x, e.y, e.phase, e.period], i * 4));
		gl.uniform4fv(U("uEyes"), flat);
		gl.uniform2f(U("uFloorEye"), floorEye.x, floorEye.y);
		let eye = 0,
			eyeTarget = 0;
		const t0 = performance.now(),
			off = Math.random() * 40;
		function frame(now) {
			eye += (eyeTarget - eye) * 0.06;
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform1f(U("uT"), reduce ? 0 : (now - t0) / 1000 + off);
			gl.uniform1f(U("uEye"), eye);
			gl.uniform1f(U("uExpo"), look.expo);
			gl.uniform1f(U("uVig"), look.vig);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
		return {
			eye(v) {
				eyeTarget = v;
			},
		};
	}
	window.ENV = { mount };
})();
