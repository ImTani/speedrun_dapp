// Style lab for the Gathering: non-photoreal passes over the lit three.js scene.
// "ink" leans on Darkest Dungeon (woodcut ink, crushed blacks, bone/umber/blood, glass the only jewel colour);
// "paint" leans on Supergiant's Hades (saturated colour blocks, violet shadows, warm rims, punchy bloom).
// One WebGL context: the scene renders into targets, then full-screen passes grade, ink and composite it.
(() => {
	const PRESETS = {
		ink: { pal: 0, gain: 1.5, gamma: .5, light: .5, bands: 3, soft: .03, lift: 0, sat: .12, jewel: .42, blood: .85, shTint: 0, hatch: .45, hatchPx: 6, outline: 3.4, wobble: .6, lead: .8, bloom: .3, bloomThr: .62, rim: 0, brush: 1.4, strokes: 0, vig: .8, contrast: 1.2, glassFlat: .55, graphic: .85, fat: .6, jitter: .6, detail: .3, textGlow: .4, textStroke: .9, juice: 1 },
		paint: { pal: 1, gain: 1.35, gamma: .8, light: .55, bands: 4, soft: .1, lift: .05, sat: 1.2, jewel: 0, blood: 0, shTint: .8, hatch: 0, hatchPx: 6, outline: 2.6, wobble: .45, lead: .5, bloom: 1.1, bloomThr: .5, rim: 1.2, brush: 3.4, strokes: .2, vig: .45, contrast: 1.12, glassFlat: .3, graphic: .7, fat: .5, jitter: .45, detail: .45, textGlow: .55, textStroke: .8, juice: 1 },
	};
	// Tuner rows: key, label, min, max, step.
	const KEYS = [
		["gain", "Light gain into the bands", .5, 3, .01], ["gamma", "Lift the darks (lower = brighter stone)", .3, 1.2, .01], ["light", "Window light strength", .2, 1.5, .01], ["bands", "Shading bands", 2, 6, 1], ["soft", "Band edge softness", 0, .3, .01], ["lift", "Shadow floor", 0, .3, .01],
		["sat", "Colour saturation", 0, 2.2, .01], ["jewel", "Only bright light keeps colour (ink)", 0, 1, .01], ["blood", "Reds become dried blood (ink)", 0, 1, .01], ["shTint", "Violet/teal shadows (paint)", 0, 1, .01],
		["hatch", "Cross-hatching in shadow", 0, 1, .01], ["hatchPx", "Hatch spacing (px)", 3, 12, .5], ["outline", "Ink outline (px)", 0, 7, .1], ["wobble", "Hand-inked wobble", 0, 1, .01],
		["lead", "Heavier lead in the glass", 0, 1, .01], ["glassFlat", "Flatter glass colour", 0, 1, .01], ["bloom", "Bloom", 0, 2.5, .01], ["bloomThr", "Bloom threshold", 0, 1, .01],
		["rim", "Warm rim light (paint)", 0, 2.5, .01], ["brush", "Brush (Kuwahara) radius", 0, 4, .1], ["strokes", "Brush-stroke texture", 0, 1, .01], ["vig", "Black vignette", 0, 1, .01],
		["contrast", "Contrast", .6, 1.8, .01], ["graphic", "Floor light: caustic → graphic", 0, 1, .01], ["fat", "Chunkier forms", 0, 1, .01], ["jitter", "Hand-made wobble in the stone", 0, 1, .01],
		["detail", "Stone surface detail", 0, 1, .01], ["textGlow", "Lettering glow", 0, 1, .01], ["textStroke", "Lettering ink stroke", 0, 1.5, .01], ["juice", "Juice (shake, hit-stop, pops)", 0, 1.5, .01],
	];

	// World-space wobble shared by the colour pass and the edge pass, so ink lines sit on the jittered stone.
	const JIT = `
uniform float uJit, uFat, uObjJit, uObjFat;
vec3 nprH3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
vec3 nprN3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(nprH3(i), nprH3(i + vec3(1, 0, 0)), f.x), mix(nprH3(i + vec3(0, 1, 0)), nprH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(nprH3(i + vec3(0, 0, 1)), nprH3(i + vec3(1, 0, 1)), f.x), mix(nprH3(i + vec3(0, 1, 1)), nprH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
vec3 nprOffset(vec3 w, vec3 nW){ return ((nprN3(w * 2.3) - .5) * .05 + (nprN3(w * 7.1 + 3.) - .5) * .016) * uJit * uObjJit + nW * uFat * uObjFat; }
`;
	const QUAD_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
	const NORM_V = `${JIT}
uniform float uBias; varying vec3 vN; varying vec2 vUv2;
void main(){
  vUv2 = uv;
  vec4 w = modelMatrix * vec4(position, 1.);
  vec3 nW = normalize(mat3(modelMatrix) * normal);
  w.xyz += nprOffset(w.xyz, nW);
  vN = normalize(mat3(viewMatrix) * nW);
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z -= uBias * 2e-4 * gl_Position.w;
}`;
	const NORM_F = `uniform float uId, uUseAlpha; uniform sampler2D uAlpha; varying vec3 vN; varying vec2 vUv2;
void main(){ if (uUseAlpha > 1.5 || (uUseAlpha > .5 && texture2D(uAlpha, vUv2).g < .45)) discard; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n.xy * .5 + .5, uId, 1.); }`;
	// Pass A: tone-map the lit scene to display values; the glass shader already writes display values.
	const DISP_F = `uniform sampler2D tScene, tNorm; uniform float uExpo; varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .4329510) + .238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777));
  const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
  c *= uExpo / .6; c = I * c; c = RRTAndODTFit(c); c = O * c; return clamp(c, 0., 1.);
}
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb; float id = floor(texture2D(tNorm, vUv).b * 255. + .5);
  gl_FragColor = vec4((id == 40. || id == 50.) ? clamp(c, 0., 1.) : srgb(aces(c)), 1.);
}`;
	const BRIGHT_F = `uniform sampler2D tDisp; uniform vec2 uPx; uniform float uThr; varying vec2 vUv;
void main(){ vec3 s = vec3(0.);
  for (int j = -1; j <= 1; j += 2) for (int i = -1; i <= 1; i += 2) { vec3 c = texture2D(tDisp, vUv + vec2(i, j) * uPx).rgb; float l = dot(c, vec3(.299, .587, .114)); s += c * smoothstep(uThr, uThr + .25, l); }
  gl_FragColor = vec4(s * .25, 1.); }`;
	const BLUR_F = `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 s = texture2D(tIn, vUv).rgb * .227;
  s += (texture2D(tIn, vUv + uDir * 1.385).rgb + texture2D(tIn, vUv - uDir * 1.385).rgb) * .316;
  s += (texture2D(tIn, vUv + uDir * 3.231).rgb + texture2D(tIn, vUv - uDir * 3.231).rgb) * .070;
  gl_FragColor = vec4(s, 1.); }`;
	// Pass B: brush, bands, palette, hatching, ink, rim, bloom, flash, vignette.
	const COMP_F = `uniform sampler2D tDisp, tNorm, tDepth, tBloom;
uniform vec2 uPx; uniform float uDpr, uNear, uFar, uT;
uniform float uPal, uGamma, uGain, uBands, uSoft, uLift, uSat, uJewel, uBlood, uShTint, uHatch, uHatchPx, uOutline, uWobble, uLead, uGlassFlat, uBloomK, uRim, uBrush, uStrokes, uVig, uContrast;
uniform vec4 uFlash;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float luma(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
vec3 S(vec2 uv){ return texture2D(tDisp, uv).rgb; }
float idAt(vec2 uv){ return floor(texture2D(tNorm, uv).b * 255. + .5); }
float iz(vec2 uv){ float d = texture2D(tDepth, uv).r; return (uFar - d * (uFar - uNear)) / (uNear * uFar); }
vec3 nrm(vec4 t){ vec2 xy = t.xy * 2. - 1.; return vec3(xy, sqrt(max(0., 1. - dot(xy, xy)))); }
vec3 kuwa(vec2 uv, float r){
  vec3 best = S(uv); float bv = 1e9;
  for (int q = 0; q < 4; q++) {
    vec2 sg = vec2(q == 0 || q == 2 ? -1. : 1., q < 2 ? -1. : 1.);
    vec3 m = vec3(0.); float s = 0., s2 = 0.;
    for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) {
      vec3 c = S(uv + sg * vec2(float(i), float(j)) * .5 * r * uPx); float l = luma(c); m += c; s += l; s2 += l * l;
    }
    m /= 9.; s /= 9.; float v = s2 / 9. - s * s;
    if (v < bv) { bv = v; best = m; }
  }
  return best;
}
float edgeDir(vec2 uv, vec2 o, vec4 c, float ic, vec3 nc, float idc){
  vec4 a = texture2D(tNorm, uv + o), b = texture2D(tNorm, uv - o);
  float ia = iz(uv + o), ib = iz(uv - o), e = 0.;
  e = max(e, smoothstep(.012, .03, abs(ia + ib - 2. * ic) / ic));
  e = max(e, smoothstep(.06, .12, max(abs(ia - ic), abs(ib - ic)) / ic));
  e = max(e, smoothstep(.22, .4, 1. - min(dot(nc, nrm(a)), dot(nc, nrm(b)))));
  e = max(e, max(step(.5, abs(floor(a.b * 255. + .5) - idc)), step(.5, abs(floor(b.b * 255. + .5) - idc))));
  return e;
}
void main(){
  vec2 fp = gl_FragCoord.xy / uDpr;                       // css px, so the hand-made marks keep their size
  vec4 nc4 = texture2D(tNorm, vUv); float idc = floor(nc4.b * 255. + .5);
  bool glass = idc == 40. || idc == 50., text = idc == 90.;
  vec3 c = (uBrush > .05 && !glass && !text) ? kuwa(vUv, uBrush * uDpr) : S(vUv);
  float L = luma(c), g = glass ? L : pow(clamp(L * uGain, 0., 1.), uGamma);
  vec3 ink = mix(vec3(.022, .014, .012), vec3(.05, .02, .08), uPal);
  // Bands: hue kept, value rounded to a few flat steps.
  float N = glass ? 4. : uBands, f = clamp(g, 0., .999) * N, fl = floor(f);
  float Lq = (fl + smoothstep(.5 - uSoft, .5 + uSoft + 1e-4, f - fl)) / N;
  Lq = mix(uLift, 1., Lq);
  vec3 hue = c / max(L, 1e-3), col = clamp(hue * Lq, 0., 1.3);
  float mx = max(c.r, max(c.g, c.b)), sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-3);
  float keep = 0.;
  if (text) {
    col = c;
  } else if (glass) {
    col = mix(c, col, uGlassFlat) * mix(1., 1.12, uPal);
  } else if (uPal < .5) {
    // Ink: bone, umber and dried blood; only strong coloured light keeps its colour.
    vec3 p = Lq < .5 ? mix(vec3(.018, .012, .01), vec3(.30, .19, .11), Lq * 2.) : mix(vec3(.30, .19, .11), vec3(.86, .80, .66), Lq * 2. - 1.);
    float red = clamp((c.r - max(c.g, c.b)) * 4., 0., 1.);
    p = mix(p, vec3(.48, .05, .07) * (.3 + Lq), red * uBlood);
    keep = smoothstep(uJewel, uJewel + .12, g) * smoothstep(.12, .3, sat);
    col = mix(p, col * 1.15, max(keep, uSat));
  } else {
    // Paint: saturated blocks; shadows go violet on the wall and teal on the floor, never grey.
    col = mix(vec3(luma(col)), col, uSat);
    vec3 shc = mix(vec3(.30, .09, .52), vec3(.04, .30, .36), smoothstep(.35, .7, 1. - vUv.y));
    float sh = 1. - Lq;
    col = mix(col, col * .45 + shc * (.16 + .55 * Lq), uShTint * sh * sh);
  }
  // Brush-stroke texture (paint): directional streaks that move the value slightly.
  if (uStrokes > 0. && !glass && !text) { vec2 r = mat2(.8, -.6, .6, .8) * fp; float st = vn(r * vec2(.02, .28)) * .65 + vn(r * vec2(.05, .6) + 7.) * .35; col *= 1. + (st - .5) * uStrokes * .45; }
  // Cross-hatching in the shadow bands (ink).
  if (uHatch > 0. && !glass && !text) {
    float wob = (vn(fp * .07) - .5) * 2.4;
    float l1 = 1. - smoothstep(.16, .36, abs(fract((fp.x + fp.y + wob) / uHatchPx) - .5) * 2.);
    float l2 = 1. - smoothstep(.16, .36, abs(fract((fp.x - fp.y - wob) / uHatchPx) - .5) * 2.);
    float dark = 1. - smoothstep(.0, .62, g);
    float h = l1 * smoothstep(.42, .62, dark) + l2 * smoothstep(.7, .88, dark);
    col = mix(col, ink, clamp(h, 0., 1.) * uHatch * (1. - keep) * step(.02, Lq + uLift));
  }
  // Heavier lead: the dark lines in the glass grow outward.
  if (glass && uLead > 0.) {
    float r = uLead * 2.6 * uDpr, mn = 1.;
    for (int k = 0; k < 8; k++) { float a = float(k) * .785398; vec2 o = vec2(cos(a), sin(a)) * r * uPx; mn = min(mn, luma(S(vUv + o))); }
    col = mix(col, ink, (1. - smoothstep(.05, .14, mn)) * .95);
  }
  // Warm rim light (paint): edges turned away from you catch the windows' glow.
  vec3 bl = texture2D(tBloom, vUv).rgb;
  if (uRim > 0. && !glass && !text && idc != 30. && idc > 0.) { float fr = pow(1. - nrm(nc4).z, 2.6); col += vec3(1., .6, .28) * fr * uRim * (.12 + 1.6 * luma(bl)); }
  // Ink outlines from depth, normals and object ids, wobbling like a hand-inked line.
  if (uOutline > 0. && idc > 0. && !text) {   // lettering is inked from outside only, so thin strokes survive
    vec2 w = (vec2(vn(fp * .035), vn(fp * .035 + 9.)) - .5) * uWobble * 4. * uPx * uDpr;
    vec2 uv = vUv + w; vec4 c4 = texture2D(tNorm, uv); float ic = iz(uv); vec3 ncv = nrm(c4); float id2 = floor(c4.b * 255. + .5);
    float r = uOutline * .5 * uDpr * mix(1., .45 + 1.1 * vn(fp * .02 + 3.), uWobble);
    float e = 0.;
    e = max(e, edgeDir(uv, vec2(r, 0.) * uPx, c4, ic, ncv, id2));
    e = max(e, edgeDir(uv, vec2(0., r) * uPx, c4, ic, ncv, id2));
    e = max(e, edgeDir(uv, vec2(.707, .707) * r * uPx, c4, ic, ncv, id2));
    e = max(e, edgeDir(uv, vec2(.707, -.707) * r * uPx, c4, ic, ncv, id2));
    col = mix(col, ink, e);
  }
  col += bl * uBloomK;
  col = (col - .5) * uContrast + .5;
  col = mix(col, uFlash.rgb, uFlash.a);
  vec2 q = (vUv - vec2(.5, .47)) * vec2(1.25, 1.);
  col *= 1. - uVig * smoothstep(.22, .78, length(q));
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

	function create({ T, R, scene, cam, W, H, DPR }) {
		const style = { name: "off", s: { ...PRESETS.ink } };
		const SH = { uJit: { value: 0 }, uFat: { value: 0 } };
		const rtScene = new T.WebGLRenderTarget(W, H, { type: T.HalfFloatType, samples: 4 });
		const depth = new T.DepthTexture(W, H);
		const rtNorm = new T.WebGLRenderTarget(W, H, { depthTexture: depth, minFilter: T.NearestFilter, magFilter: T.NearestFilter });
		const rtDisp = new T.WebGLRenderTarget(W, H);
		const bw = W >> 2, bh = H >> 2, rtB1 = new T.WebGLRenderTarget(bw, bh, { type: T.HalfFloatType }), rtB2 = new T.WebGLRenderTarget(bw, bh, { type: T.HalfFloatType });
		const pass = (frag, uniforms) => new T.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
		const mDisp = pass(DISP_F, { tScene: { value: rtScene.texture }, tNorm: { value: rtNorm.texture }, uExpo: { value: 1 } });
		const mBright = pass(BRIGHT_F, { tDisp: { value: rtDisp.texture }, uPx: { value: new T.Vector2(1.5 / W, 1.5 / H) }, uThr: { value: .5 } });
		const mBlur = pass(BLUR_F, { tIn: { value: null }, uDir: { value: new T.Vector2() } });
		const cu = { tDisp: { value: rtDisp.texture }, tNorm: { value: rtNorm.texture }, tDepth: { value: depth }, tBloom: { value: rtB1.texture }, uPx: { value: new T.Vector2(1 / W, 1 / H) }, uDpr: { value: DPR }, uNear: { value: cam.near }, uFar: { value: cam.far }, uT: { value: 0 }, uFlash: { value: new T.Vector4() } };
		const U = { pal: "uPal", gamma: "uGamma", gain: "uGain", bands: "uBands", soft: "uSoft", lift: "uLift", sat: "uSat", jewel: "uJewel", blood: "uBlood", shTint: "uShTint", hatch: "uHatch", hatchPx: "uHatchPx", outline: "uOutline", wobble: "uWobble", lead: "uLead", glassFlat: "uGlassFlat", bloom: "uBloomK", rim: "uRim", brush: "uBrush", strokes: "uStrokes", vig: "uVig", contrast: "uContrast" };
		for (const n of Object.values(U)) cu[n] = { value: 0 };
		const mComp = pass(COMP_F, cu);
		const quadScene = new T.Scene(), quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		const quad = new T.Mesh(new T.PlaneGeometry(2, 2), mComp); quad.frustumCulled = false; quadScene.add(quad);
		const fs = (mat, target) => { quad.material = mat; R.setRenderTarget(target); R.render(quadScene, quadCam); };
		const ov = new T.ShaderMaterial({ vertexShader: NORM_V, fragmentShader: NORM_F, side: T.DoubleSide, uniforms: { uJit: SH.uJit, uFat: SH.uFat, uObjJit: { value: 0 }, uObjFat: { value: 0 }, uId: { value: 0 }, uBias: { value: 0 }, uUseAlpha: { value: 0 }, uAlpha: { value: null } } });
		let normPass = false;
		const hook = (r, s, c, g, m) => {
			if (!normPass || m !== ov) return;
			const d = hook.obj.userData.npr || {};
			ov.uniforms.uId.value = (d.id || 5) / 255; ov.uniforms.uObjJit.value = d.jit || 0; ov.uniforms.uObjFat.value = d.fat || 0;
			const om = hook.obj.material;
			ov.uniforms.uBias.value = d.text ? 1 : 0;
			ov.uniforms.uUseAlpha.value = d.text ? (om.opacity < .35 ? 2 : 1) : 0; ov.uniforms.uAlpha.value = d.text ? om.alphaMap : null;
			ov.uniformsNeedUpdate = true;
		};
		// Lit materials get the same wobble in their vertex stage (identity while the style is off).
		function prepMaterial(mat, { jit = 1, fat = 0 } = {}) {
			mat.userData.nprJit = jit; mat.userData.nprFat = fat;
			mat.onBeforeCompile = (sh) => {
				sh.uniforms.uJit = SH.uJit; sh.uniforms.uFat = SH.uFat; sh.uniforms.uObjJit = { value: jit }; sh.uniforms.uObjFat = { value: fat };
				sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${JIT}`).replace("#include <begin_vertex>", `#include <begin_vertex>
  { vec4 nw = modelMatrix * vec4(transformed, 1.); vec3 nn = normalize(mat3(modelMatrix) * objectNormal);
    transformed += inverse(mat3(modelMatrix)) * nprOffset(nw.xyz, nn); }`);
			};
			mat.needsUpdate = true;
		}
		// Every mesh carries an id (for ink between objects) and its wobble flags; text and decals sit out the edge pass.
		function tagAll() {
			scene.traverse((o) => {
				if (!o.isMesh || o.userData.nprHooked) return;
				o.userData.nprHooked = true;
				const prev = o.onBeforeRender;
				o.onBeforeRender = function (...a) { hook.obj = this; hook(...a); prev.apply(this, a); };
			});
		}
		function setPreset(name, values) {
			style.name = name;
			if (name !== "off") Object.assign(style.s, PRESETS[name], values || {});
			apply();
		}
		function apply() {
			const on = style.name !== "off", s = style.s;
			SH.uJit.value = on ? s.jitter : 0; SH.uFat.value = on ? s.fat * .032 : 0;
			for (const [k, n] of Object.entries(U)) cu[n].value = s[k];
			mBright.uniforms.uThr.value = s.bloomThr;
			R.shadowMap.autoUpdate = !on;
		}
		function render(t, expo, flash) {
			tagAll();
			cu.uT.value = t; mDisp.uniforms.uExpo.value = expo; cu.uFlash.value.copy(flash);
			const bg = scene.background, hidden = [];
			scene.traverse((o) => { if (o.isMesh && o.visible && o.userData.npr?.skip) { o.visible = false; hidden.push(o); } });
			scene.background = null; scene.overrideMaterial = ov; normPass = true;
			R.setClearColor(0x808000, 0); R.setRenderTarget(rtNorm); R.clear(); R.render(scene, cam);
			normPass = false; scene.overrideMaterial = null; scene.background = bg;
			for (const o of hidden) o.visible = true;
			R.setClearColor(0x000000, 1);
			R.shadowMap.needsUpdate = true;
			R.setRenderTarget(rtScene); R.render(scene, cam);
			fs(mDisp, rtDisp);
			fs(mBright, rtB1);
			for (const r of [1, 2.2]) {
				mBlur.uniforms.tIn.value = rtB1.texture; mBlur.uniforms.uDir.value.set(r / bw, 0); fs(mBlur, rtB2);
				mBlur.uniforms.tIn.value = rtB2.texture; mBlur.uniforms.uDir.value.set(0, r / bh); fs(mBlur, rtB1);
			}
			fs(mComp, null);
		}
		return { style, PRESETS, KEYS, prepMaterial, setPreset, apply, render, on: () => style.name !== "off" };
	}
	window.NPR = { create, PRESETS, KEYS };
})();
