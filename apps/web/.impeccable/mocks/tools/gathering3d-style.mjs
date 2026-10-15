// Style lab: wire glass/npr.js into the three.js Gathering (?style=ink|paint|off, a style section in ?tune),
// graphic floor light, chunkier forms, ink-stroked lettering, and juice on the beats.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering3d.html";
let s = readFileSync(file, "utf8");
const missing = [];
const rep = (a, b) => { if (!s.includes(a)) missing.push(a.slice(0, 90)); s = s.replace(a, b); };

// Fonts and script.
rep(`family=Spectral+SC:wght@500;600&family=Spectral:ital,wght@1,400;1,500&display=swap`, `family=Spectral+SC:wght@500;600;800&family=Spectral:ital,wght@1,400;1,500&family=Grenze+Gotisch:wght@700&display=swap`);
rep(`<script src="glass.js"></script><script src="glassgl.js"></script><script src="masks.js"></script>`, `<script src="glass.js"></script><script src="glassgl.js"></script><script src="masks.js"></script><script src="npr.js"></script>`);

// The style pipeline, created with the renderer.
rep(`cam.position.copy(CAM.pos); cam.lookAt(CAM.at);`, `cam.position.copy(CAM.pos); cam.lookAt(CAM.at);
// Style lab (?style=ink|paint|off): non-photoreal passes over this same lit scene. Off is the look as built.
const NP = NPR.create({ T, R, scene, cam, W: SW * DPR, H: SH * DPR, DPR });
const STYLE0 = ["ink", "paint"].includes(Q.get("style")) ? Q.get("style") : "off";
// Lettering per style: ink cuts it in blackletter; paint in heavy capitals; off keeps the engraved small caps.
const FONT = (px) => NP.style.name === "ink" ? \`700 \${Math.round(px * 1.12)}px "Grenze Gotisch"\` : NP.style.name === "paint" ? \`800 \${px}px "Spectral SC"\` : \`600 \${px}px "Spectral SC"\`;
const CASE = (t) => NP.style.name === "ink" ? t : t.toUpperCase();`);

// Materials: wobble-ready; hoods and colonnette can fatten.
rep(`const wall = new T.Group();`, `NP.prepMaterial(stoneMat);
const wall = new T.Group();`);
rep(`for (const g of wallParts) { const m = new T.Mesh(g, stoneMat); m.castShadow = m.receiveShadow = true; wall.add(m); }`,
	`for (const g of wallParts) { const m = new T.Mesh(g, stoneMat); m.castShadow = m.receiveShadow = true; m.userData.npr = { id: 10, jit: 1 }; wall.add(m); }`);
rep(`function add(geo, mat, x, y, z, shadow = true) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; }
add(new T.CylinderGeometry(.042, .046, FRONT.spring, 20), trimMat, 0, FRONT.spring / 2, .05);
add(new T.BoxGeometry(.15, .07, .13), trimMat, 0, FRONT.spring + .035, .05);
add(new T.BoxGeometry(.14, .1, .12), trimMat, 0, .05, .05);
add(new T.BoxGeometry(6.8, .075, .11), trimMat, 0, FRONT.sill - .035, .055);
add(new T.BoxGeometry(6.8, .05, .07), trimMat, 0, FRONT.sill - .1, .035);`,
	`const trimFatMat = trimMat.clone();
NP.prepMaterial(trimMat); NP.prepMaterial(trimFatMat, { fat: 1 });
function add(geo, mat, x, y, z, shadow = true, npr = { id: 20, jit: 1 }) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; m.userData.npr = npr; scene.add(m); return m; }
// Chunky: boxes thicken by scale, round mouldings by pushing along their normals (see npr.js).
const CHUNK = [];
add(new T.CylinderGeometry(.042, .046, FRONT.spring, 20), trimFatMat, 0, FRONT.spring / 2, .05, true, { id: 20, jit: 1, fat: 1 });
CHUNK.push([add(new T.BoxGeometry(.15, .07, .13), trimMat, 0, FRONT.spring + .035, .05), [1, 1, 1]]);
CHUNK.push([add(new T.BoxGeometry(.14, .1, .12), trimMat, 0, .05, .05), [1, 1, 1]]);
CHUNK.push([add(new T.BoxGeometry(6.8, .075, .11), trimMat, 0, FRONT.sill - .035, .055), [0, 1, 1]]);
CHUNK.push([add(new T.BoxGeometry(6.8, .05, .07), trimMat, 0, FRONT.sill - .1, .035), [0, 1, 1]]);`);
rep(`add(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, "centripetal"), 120, .026, 8, false), trimMat, 0, 0, 0);`,
	`add(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, "centripetal"), 120, .026, 8, false), trimFatMat, 0, 0, 0, true, { id: 20, jit: 1, fat: 1 });`);
rep(`floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4.5); floor.receiveShadow = true;`, `floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4.5); floor.receiveShadow = true; floor.userData.npr = { id: 30 };`);

// Lettering: an ink stroke around gilt, a colour map for it, and a glow so it reads at a glance.
rep(`await Promise.all([document.fonts.load('600 64px "Spectral SC"'), document.fonts.load('italic 400 40px "Spectral"'), document.fonts.load('italic 500 40px "Spectral"')]).catch(() => {});
function carve(w, h, draw) {
	const m = document.createElement("canvas"); m.width = w; m.height = h;
	const mx = m.getContext("2d"); mx.fillStyle = "#000"; mx.fillRect(0, 0, w, h); mx.fillStyle = "#fff"; mx.textAlign = "center"; mx.textBaseline = "alphabetic"; draw(mx);`,
	`await Promise.all([document.fonts.load('600 64px "Spectral SC"'), document.fonts.load('800 64px "Spectral SC"'), document.fonts.load('700 64px "Grenze Gotisch"'), document.fonts.load('italic 400 40px "Spectral"'), document.fonts.load('italic 500 40px "Spectral"')]).catch(() => {});
function carve(w, h, draw) {
	// Styled: every line gets an ink stroke. The shape canvas cuts stroke + fill; the ink canvas colours the stroke dark.
	const sk = NP.on() ? NP.style.s.textStroke : 0;
	const pen = (bg, strokeCol) => {
		const c = document.createElement("canvas"); c.width = w; c.height = h;
		const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.textAlign = "center"; x.textBaseline = "alphabetic";
		const fill = x.fillText.bind(x);
		x.fillText = (t, X, Y) => {
			if (sk > 0) { const px = parseFloat(x.font.match(/([\\d.]+)px/)[1]); x.save(); x.lineJoin = "round"; x.lineWidth = sk * px * .22; x.strokeStyle = strokeCol; x.strokeText(t, X, Y); x.restore(); }
			x.fillStyle = "#fff"; fill(t, X, Y);
		};
		draw(x); return c;
	};
	const m = pen("#000", "#fff"), ink = pen("#fff", "#120a08");
	const mx = m.getContext("2d");`);
rep(`	return { alpha: a, bump: b };
}`, `	return { alpha: a, bump: b, ink };
}`);
rep(`	const alphaMap = new T.CanvasTexture(c.alpha), bumpMap = new T.CanvasTexture(c.bump);
	const mat = new T.MeshStandardMaterial({ color, roughness: .5, metalness: 0, alphaMap, bumpMap, bumpScale, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
	const mesh = new T.Mesh(new T.PlaneGeometry(wd, ht), mat); mesh.receiveShadow = true;
	mesh.userData.redraw = (fn) => { const n = carve(c.alpha.width, c.alpha.height, fn); alphaMap.image = n.alpha; bumpMap.image = n.bump; alphaMap.needsUpdate = bumpMap.needsUpdate = true; };
	return mesh;`,
	`	const alphaMap = new T.CanvasTexture(c.alpha), bumpMap = new T.CanvasTexture(c.bump), map = new T.CanvasTexture(c.ink);
	map.colorSpace = T.SRGBColorSpace;
	const mat = new T.MeshStandardMaterial({ color, map, emissive: color, emissiveMap: map, emissiveIntensity: 0, roughness: .5, metalness: 0, alphaMap, bumpMap, bumpScale, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
	const mesh = new T.Mesh(new T.PlaneGeometry(wd, ht), mat); mesh.receiveShadow = true; mesh.userData.npr = { skip: true };
	mesh.userData.draw = draw;
	mesh.userData.redraw = (fn) => { mesh.userData.draw = fn; const n = carve(c.alpha.width, c.alpha.height, fn); alphaMap.image = n.alpha; bumpMap.image = n.bump; map.image = n.ink; alphaMap.needsUpdate = bumpMap.needsUpdate = map.needsUpdate = true; };
	CARVED.push(mesh);
	return mesh;`);
rep(`function carvedPlane(wd, ht, px, draw, color, bumpScale) {`, `const CARVED = [];
function carvedPlane(wd, ht, px, draw, color, bumpScale) {`);
// Fonts through FONT()/CASE() so each style letters in its own hand.
rep(`x.letterSpacing = "6px"; fitText(x, s.data.name.toUpperCase(), 440, '600 76px "Spectral SC"'); x.fillText(s.data.name.toUpperCase(), 252, 72);`,
	`x.letterSpacing = NP.style.name === "ink" ? "1px" : "6px"; fitText(x, CASE(s.data.name), 440, FONT(76)); x.fillText(CASE(s.data.name), 252, 72);`);
rep(`x.letterSpacing = "5px"; fitText(x, l1.toUpperCase(), 900, '600 92px "Spectral SC"'); x.fillText(l1.toUpperCase(), 504, 104);`,
	`x.letterSpacing = NP.style.name === "ink" ? "1px" : "5px"; fitText(x, CASE(l1), 900, FONT(92)); x.fillText(CASE(l1), 504, 104);`);
rep(`x.letterSpacing = "4px"; fitText(x, r.h.toUpperCase(), 820, '600 86px "Spectral SC"'); x.fillText(r.h.toUpperCase(), 520, 120);`,
	`x.letterSpacing = NP.style.name === "ink" ? "1px" : "4px"; fitText(x, CASE(r.h), 820, FONT(86)); x.fillText(CASE(r.h), 520, 120);`);
rep(`eyeDisc.rotation.x = -Math.PI / 2; eyeDisc.position.set(0, .002, EYE_Z); eyeDisc.receiveShadow = true; scene.add(eyeDisc);`,
	`eyeDisc.rotation.x = -Math.PI / 2; eyeDisc.position.set(0, .002, EYE_Z); eyeDisc.receiveShadow = true; eyeDisc.userData.npr = { skip: true }; scene.add(eyeDisc);`);

// Fittings.
rep(`const brass = new T.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .45, metalness: .5 });`, `const brass = new T.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .45, metalness: .5 });
NP.prepMaterial(iron); NP.prepMaterial(brass);`);
rep(`add(new T.BoxGeometry(.06, .07, .05), iron, -1.12, 3.23, .025);`, `add(new T.BoxGeometry(.06, .07, .05), iron, -1.12, 3.23, .025, true, { id: 70, jit: 1 });`);
rep(`ring.position.set(0, -.09, .02); ring.castShadow = true; ringPivot.add(ring);`, `ring.position.set(0, -.09, .02); ring.castShadow = true; ring.userData.npr = { id: 71, jit: 1 }; ringPivot.add(ring);`);
rep(`hourglass.add(bulb);`, `bulb.userData.npr = { id: 81 }; hourglass.add(bulb);`);
rep(`sand.position.y = .042; hourglass.add(sand);`, `sand.position.y = .042; sand.userData.npr = { id: 82 }; hourglass.add(sand);`);
rep(`for (const y of [.009, .229]) { const m = new T.Mesh(cap, brass); m.position.y = y; m.castShadow = true; hourglass.add(m); }`,
	`for (const y of [.009, .229]) { const m = new T.Mesh(cap, brass); m.position.y = y; m.castShadow = true; m.userData.npr = { id: 80, jit: 1 }; hourglass.add(m); }`);
rep(`m.position.set(Math.cos(a) * .06, .119, Math.sin(a) * .06); m.castShadow = true; hourglass.add(m); }`, `m.position.set(Math.cos(a) * .06, .119, Math.sin(a) * .06); m.castShadow = true; m.userData.npr = { id: 80 }; hourglass.add(m); }`);

// Floor light: graphic shapes (posterised panes with their lead) or soft caustics, on one slider.
rep(`uniform sampler2D uCol; uniform vec4 uRect;`, `uniform sampler2D uCol, uSharp, uLeadP; uniform float uGraphic; uniform vec4 uRect;`);
rep(`  vec3 c = g.rgb * g.rgb * g.a;
  c = c / (c + .14) * .46; `, `  vec3 c = g.rgb * g.rgb * g.a;
  vec4 gs = texture2D(uSharp, clamp(a, .01, .99));
  vec3 ps = (floor(gs.rgb * 3.) + .5) / 3.;
  vec3 cg = ps * ps * gs.a * (1. - smoothstep(.25, .6, texture2D(uLeadP, clamp(a, .01, .99)).r));
  c = mix(c, cg * 1.25, uGraphic);
  c = c / (c + .14) * .46; `);
rep(`c *= .5 + uCaus * 1.4 * cz;`, `c *= mix(.5 + uCaus * 1.4 * cz, .8, uGraphic);`);
rep(`const mu = { uCol: { value: tex(L.blur, true) },`, `const mu = { uSharp: { value: tex(L.col, true) }, uLeadP: { value: tex(L.lead, true) }, uGraphic: { value: 0 }, uCol: { value: tex(L.blur, true) },`);
rep(`const rt = new T.WebGLRenderTarget(256, 256, { type: T.HalfFloatType, depthBuffer: false });`, `const rt = new T.WebGLRenderTarget(512, 512, { type: T.HalfFloatType, depthBuffer: false });`);
rep(`glass.position.set(s.wx, YC, WIN.glassZ); scene.add(glass);`, `glass.position.set(s.wx, YC, WIN.glassZ); glass.userData.npr = { id: k === "you" ? 50 : 40 }; scene.add(glass);`);
// Medallions keep their rims, so both can pop.
rep(`			m.position.set(x, y, .006); scene.add(m);
		const rim = new T.Mesh(new T.RingGeometry(.028, .036, 18), iron); rim.position.set(x, y, .007); scene.add(rim);
		return m;`, `		m.position.set(x, y, .006); m.userData.npr = { id: 60, jit: 1 }; scene.add(m);
		const rim = new T.Mesh(new T.RingGeometry(.028, .036, 18), iron); rim.position.set(x, y, .007); rim.userData.npr = { id: 70, jit: 1 }; scene.add(rim);
		m.userData.rim = rim; m.userData.popT = -9;
		return m;`);
rep(`finger.castShadow = true; finger.visible = false; scene.add(finger);`, `finger.castShadow = true; finger.visible = false; finger.userData.npr = { skip: true }; scene.add(finger);`);

// Juice: flash, hit-stop, shake, slams and pops. All of it is off with the style off or with reduced motion.
rep(`const par = { x: 0, y: 0, tx: 0, ty: 0 };`, `const par = { x: 0, y: 0, tx: 0, ty: 0 };
const JU = { flash: new T.Vector4(), shake: 0, shakeT: -9, stopUntil: 0 };
const J = () => (NP.on() && !reduce ? NP.style.s.juice : 0);
function flash(r, g, b, a) { if (!NP.on()) return; JU.flash.set(r, g, b, Math.max(JU.flash.w, a * (reduce ? .3 : Math.min(1, NP.style.s.juice)))); }
function shake(a) { if (J()) { JU.shake = a * J(); JU.shakeT = clock.t; } }
function hitstop(ms) { if (J()) JU.stopUntil = performance.now() + ms * J(); }
const slam = (m) => { m.userData.slamT = clock.t; };
const slamScale = (m, t) => 1 + J() * .5 * Math.exp(-(t - (m.userData.slamT ?? -9)) * 6) * Math.cos((t - (m.userData.slamT ?? -9)) * 15);`);
rep(`	const dt = Math.min(1, (now - clock.prev) / 1000); clock.prev = now;`, `	const realDt = Math.min(1, (now - clock.prev) / 1000), dt = now < JU.stopUntil ? 0 : realDt; clock.prev = now;
	JU.flash.w *= Math.exp(-realDt * 11);`);
rep(`			md.material.emissiveIntensity = ease(md.material.emissiveIntensity, on + head, 9, dt);`, `			md.material.emissiveIntensity = ease(md.material.emissiveIntensity, on + head, 9, dt);
			if (j < w.lit && md.userData.popT < 0) md.userData.popT = t; else if (j >= w.lit) md.userData.popT = -9;
			const age = t - md.userData.popT, sc = (1 + (NP.on() ? NP.style.s.fat * .6 : 0)) * (md.userData.popT >= 0 && J() ? 1 + J() * .9 * Math.exp(-age * 7) * Math.cos(age * 17) : 1);
			md.scale.setScalar(sc); md.userData.rim.scale.setScalar(sc);`);
rep(`	txtA = ease(txtA, txtTg, 3, dt); turnText.material.opacity = txtA;
	endA = ease(endA, endTg, 1.6, dt); endText.material.opacity = endA;`, `	txtA = ease(txtA, txtTg, NP.on() && txtTg > txtA ? 12 : 3, dt); turnText.material.opacity = txtA;
	endA = ease(endA, endTg, NP.on() ? 9 : 1.6, dt); endText.material.opacity = endA;
	turnText.scale.setScalar(slamScale(turnText, t)); endText.scale.setScalar(slamScale(endText, t));
	const on = NP.on(), S = NP.style.s;
	for (const m of CARVED) m.material.emissiveIntensity = on ? S.textGlow : 0;
	stoneMat.normalScale.setScalar(on ? S.detail : 1); trimMat.normalScale.setScalar(on ? S.detail : 1); trimFatMat.normalScale.setScalar(on ? S.detail : 1); floorMat.normalScale.setScalar(on ? .5 * S.detail : .5);
	for (const [m, ax] of CHUNK) { const f = on ? S.fat * .7 : 0; m.scale.set(1 + f * ax[0], 1 + f * ax[1], 1 + f * ax[2]); }
	for (const k of ["opp", "you"]) { W[k].mu.uGraphic.value = on ? S.graphic : 0; W[k].spot.shadow.radius = on ? 3 - 2.2 * S.graphic : 3; }`);
rep(`	cam.position.lerpVectors(CAM.pos, CAM_END.pos, camBlend).add(new T.Vector3(par.x * .45, par.y * .25, 0));`, `	const shk = JU.shake * Math.exp(-(t - JU.shakeT) * 7);
	cam.position.lerpVectors(CAM.pos, CAM_END.pos, camBlend).add(new T.Vector3(par.x * .45 + shk * .07 * Math.sin(t * 71), par.y * .25 + shk * .05 * Math.sin(t * 53 + 1), 0));`);
rep(`	R.setRenderTarget(null);
	R.render(scene, cam);`, `	R.setRenderTarget(null);
	if (NP.on()) NP.render(t, LOOK.expo, JU.flash); else R.render(scene, cam);`);

// Beats.
rep(`	buzz(12); await wait(600); if (my !== gen) return;`, `	flash(1, .9, .72, .3); buzz(12); await wait(600); if (my !== gen) return;`);
rep(`	if (key === "KD") { Object.assign(W.opp.tg,`, `	if (key === "KD" || key === "DK") { hitstop(120); shake(1); flash(.85, .06, .09, .38); }
	if (key === "DD") { shake(.45); flash(.6, .04, .07, .22); }
	if (key === "KD") { Object.assign(W.opp.tg,`);
rep(`	txtTg = 1;
	$("#say").textContent = SAY[key].join(" ");`, `	txtTg = 1; slam(turnText);
	$("#say").textContent = SAY[key].join(" ");`);
rep(`	txtTg = 0; eyeTg = .35; writeEnd(); endTg = 1; camBlendTg = 1;`, `	txtTg = 0; eyeTg = .35; writeEnd(); endTg = 1; camBlendTg = 1; slam(endText); flash(1, .94, .8, .35);`);

// Style switch: preset, then every carved line redrawn in that style's hand.
rep(`$(".vign").style.setProperty("--vig", Math.min(.9, LOOK.vig * 4.5));`, `$(".vign").style.setProperty("--vig", Math.min(.9, LOOK.vig * 4.5));
function setStyle(name, values) {
	NP.setPreset(name, values);
	$(".vign").style.display = NP.on() ? "none" : "";
	for (const m of CARVED) m.userData.redraw(m.userData.draw);
}
setStyle(STYLE0);`);

// Tuner: style section.
rep(`	box.querySelector("#copy").addEventListener("click", (e) => { navigator.clipboard.writeText(JSON.stringify(LOOK)); e.target.textContent = "Copied: paste it to Claude"; });
}`, `	box.querySelector("#copy").addEventListener("click", (e) => { navigator.clipboard.writeText(JSON.stringify(LOOK)); e.target.textContent = "Copied: paste it to Claude"; });
	box.style.maxHeight = "calc(100vh - 32px)"; box.style.overflow = "auto";
	const sb = document.createElement("div");
	sb.innerHTML = '<hr style="margin:12px 0;border:0;border-top:1px solid #cfc8bb"><b>Style</b> <select id="sty" style="float:right;font:inherit"><option value="off">Off (as built)</option><option value="ink">Ink</option><option value="paint">Painted</option></select>'
		+ NPR.KEYS.map(([k, l, a, b, st]) => \`<label style="display:block;margin:8px 0">\${l} <output id="so-\${k}" style="float:right"></output><input style="width:100%" type="range" min="\${a}" max="\${b}" step="\${st}" data-s="\${k}"></label>\`).join("")
		+ '<button id="scopy">Copy style values</button>';
	box.appendChild(sb);
	const sel = sb.querySelector("#sty");
	const sync = () => { sel.value = NP.style.name; sb.querySelectorAll("input").forEach((i) => { i.value = NP.style.s[i.dataset.s]; i.disabled = !NP.on(); sb.querySelector("#so-" + i.dataset.s).textContent = (+NP.style.s[i.dataset.s]).toFixed(2); }); };
	sel.addEventListener("change", () => { setStyle(sel.value); sync(); });
	sb.querySelectorAll("input").forEach((i) => i.addEventListener("input", () => {
		NP.style.s[i.dataset.s] = +i.value; NP.apply(); sb.querySelector("#so-" + i.dataset.s).textContent = (+i.value).toFixed(2);
		if (i.dataset.s === "textStroke") for (const m of CARVED) m.userData.redraw(m.userData.draw);
	}));
	sb.querySelector("#scopy").addEventListener("click", (e) => { navigator.clipboard.writeText(JSON.stringify({ style: NP.style.name, ...NP.style.s })); e.target.textContent = "Copied: paste it to Claude"; });
	box.addEventListener("pointerdown", (e) => e.stopPropagation());
	sync();
}`);

writeFileSync(file, s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "style lab wired");
