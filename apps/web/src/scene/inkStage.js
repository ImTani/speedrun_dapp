// The Gathering stage, ported from .impeccable/mocks/glass/ink-devour.html (the approved ink study).
// Same drawing, look values and timeline; generalised so any pair of Fragments can play any outcome:
// one Devours (mirrored either way), both Kindle (both windows brighten), both Devour (both dim).
//
// This module draws the PLACE only: the ink cathedral, the two shader windows, their medallion rings,
// the caustic floor and the floor eye. Everything a player reads (masks, names, the verdict, the
// flash and the shake) is DOM laid over it by the screen, which listens to the beats emitted here
// (opts.onBeat: "hush" -> "reveal" -> "tally" -> "end") and positions itself with `geom`.
// The stage is a fixed 390 x 844 world; the caller scales it to COVER its box (see screens/gathering/layout.ts).
// Browser-only: import dynamically from a client component.

import { FLOOR } from "./floorgl.js";
import { G } from "./glass.js";
import { GL } from "./glassgl.js";

/** World size of the stage (CSS px before the caller's scale). */
const SW = 390,
	SH = 844;

const CSS = `
.ink-stage{--ink:1;position:absolute;left:0;top:0;width:390px;height:844px;overflow:hidden;background:#0b0807;transform-origin:0 0;touch-action:manipulation;user-select:none;opacity:0;transition:opacity .6s cubic-bezier(.16,1,.3,1)}
.ink-stage.on{opacity:1}
.ink-stage .cam,.ink-stage .cam>*{position:absolute;left:0;top:0;width:390px;height:844px;display:block}
.ink-stage .light{mix-blend-mode:screen}
.ink-stage .cam>.gwin{width:128px;height:179.2px;top:118px}.ink-stage .winA{left:33px}.ink-stage .winB{left:229px}
.ink-stage .cam>.floorC{top:430px;height:414px;mix-blend-mode:screen}
.ink-stage .k{fill:none;stroke:#0b0807;stroke-linejoin:round;stroke-linecap:round}
.ink-stage .k2{stroke-width:calc(var(--ink) * 2px)}.ink-stage .k3{stroke-width:calc(var(--ink) * 3px)}.ink-stage .k4{stroke-width:calc(var(--ink) * 4.5px)}.ink-stage .k6{stroke-width:calc(var(--ink) * 6px)}
.ink-stage .screen{mix-blend-mode:screen}`;

function ensureHead() {
	if (!document.getElementById("ink-stage-css")) {
		const st = document.createElement("style");
		st.id = "ink-stage-css";
		st.textContent = CSS;
		document.head.appendChild(st);
	}
}

/**
 * mountStage(root, { onBeat }) -> Promise<Stage>
 * Builds the 390 x 844 stage inside `root` (the caller scales and crops it to cover its box).
 */
export async function mountStage(root, opts = {}) {
	ensureHead();
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const el = document.createElement("main");
	el.className = "ink-stage";
	el.innerHTML = `<div class="cam"><img class="back" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><canvas class="gwin winA" id="winA"></canvas><canvas class="gwin winB" id="winB"></canvas><canvas class="floorC"></canvas><canvas class="light"></canvas><img class="front" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><svg class="scene" viewBox="0 0 390 844" aria-hidden="true"></svg></div>`;
	el.setAttribute("aria-hidden", "true");
	root.appendChild(el);
	const $ = (s) => el.querySelector(s);
	const byId = (id) => el.querySelector(`#${id}`);
	let dead = false;

	// ---------- Palette ----------
	const INK = "#0b0807",
		BONE = "#d8c6a0",
		BONE_D = "#a8916a",
		BLOOD_L = "#c7262c";
	// Owner-tuned 2026-10-15 (locked).
	const LOOK = {
		ink: 0.4,
		wobble: 3.6,
		hatch: 0.24,
		shaft: 0.065,
		pool: 0.27,
		halo: 0.36,
		glow: 1.46,
		shake: 12,
		hitstop: 200,
		flash: 0.45,
		speed: 1.25,
		caustic: 1.6,
	};
	el.style.setProperty("--ink", String(LOOK.ink));
	function rng(seed) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const R = rng(1471);
	const f1 = (n) => n.toFixed(1);
	const jq = (pts, j) =>
		pts.map(([x, y]) => [x + (R() - 0.5) * 2 * j, y + (R() - 0.5) * 2 * j]);
	const P = (pts) => pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
	const poly = (pts, fill, extra = "") =>
		`<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
	const lerp = (a, b, k) => a + (b - a) * k;
	const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
	const smooth = (a, b, x) => {
		const k = clamp((x - a) / (b - a));
		return k * k * (3 - 2 * k);
	};
	const outExp = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
	function brush(pts, w, fill = INK, extra = "") {
		const L = [],
			Rt = [];
		for (let i = 0; i < pts.length; i++) {
			const [x, y] = pts[i],
				[ax, ay] = pts[Math.max(0, i - 1)],
				[bx, by] = pts[Math.min(pts.length - 1, i + 1)];
			let nx = -(by - ay),
				ny = bx - ax;
			const l = Math.hypot(nx, ny) || 1;
			nx /= l;
			ny /= l;
			const k = i / (pts.length - 1),
				ww =
					(w * Math.sin(Math.PI * (0.08 + 0.84 * k)) * (0.8 + R() * 0.4)) / 2;
			L.push([x + nx * ww, y + ny * ww]);
			Rt.unshift([x - nx * ww, y - ny * ww]);
		}
		return poly(L.concat(Rt), fill, extra);
	}

	// ---------- Layout ----------
	const GW = 128,
		GH = (GW * 420) / 300,
		GTOP = 118,
		GBOT = GTOP + GH,
		SPRING = GTOP + GW / 2;
	// The glass art per window stays fixed (owner-locked themes); the masks and names change per duel.
	const WIN = {
		A: { cx: 97, theme: "marrow", seed: 3, aspect: "madness", tint: "#e9c27a" },
		B: { cx: 293, theme: "vesper", seed: 7, aspect: "echo", tint: "#f0a95a" },
	};
	for (const w of Object.values(WIN)) {
		w.x0 = w.cx - GW / 2;
		w.x1 = w.cx + GW / 2;
	}
	const archPath = (cx, r, spring, bottom) =>
		`M${f1(cx - r)} ${f1(bottom)} V${f1(spring)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r)} ${f1(spring)} V${f1(bottom)} Z`;
	const archPts = (cx, r, spring, bottom, n = 18) => {
		const pts = [[cx - r, bottom]];
		for (let i = 0; i <= n; i++) {
			const a = Math.PI + (i / n) * Math.PI;
			pts.push([cx + Math.cos(a) * r, spring + Math.sin(a) * r]);
		}
		pts.push([cx + r, bottom]);
		return pts;
	};
	function windowArt(w) {
		return G.windowSVG({
			theme: w.theme,
			seed: w.seed,
			mode: "color",
			width: 300,
		})
			.replace(/stroke-width="3.5"/g, 'stroke-width="7"')
			.replace(/stroke-width="10"/g, 'stroke-width="18"')
			.replace(
				/<svg [^>]*>/,
				'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 300 420" overflow="hidden">',
			);
	}

	// ---------- Static drawing ----------
	const defs = [],
		ART = {},
		ink = [];
	defs.push(`
<filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="9"/><feDisplacementMap scale="${LOOK.wobble}" in="SourceGraphic" xChannelSelector="R" yChannelSelector="G"/></filter>
<pattern id="hatch" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">${(() => {
		let h = "";
		for (let y = 2; y < 44; y += 5.5) {
			let x = R() * -10;
			while (x < 44) {
				const l = 10 + R() * 22;
				h += brush(
					[
						[x, y],
						[x + l / 2, y + (R() - 0.5)],
						[x + l, y],
					],
					1.5 + R() * 0.6,
				);
				x += l + 3 + R() * 6;
			}
		}
		return h;
	})()}</pattern>
<pattern id="xhatch" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(42)">${(() => {
		let h = "";
		for (let y = 3; y < 44; y += 6) {
			let x = R() * -10;
			while (x < 44) {
				const l = 8 + R() * 18;
				h += brush(
					[
						[x, y],
						[x + l / 2, y + (R() - 0.5)],
						[x + l, y],
					],
					1.3,
				);
				x += l + 5 + R() * 8;
			}
		}
		return h;
	})()}</pattern>`);
	for (const [k, w] of Object.entries(WIN)) {
		ART[k] = windowArt(w);
		defs.push(
			`<image id="art${k}" width="300" height="420" preserveAspectRatio="none"/><image id="art${k}g" width="300" height="420" preserveAspectRatio="none"/>`,
		);
		defs.push(
			`<clipPath id="glass${k}"><path d="${archPath(w.cx, GW / 2, SPRING, GBOT)}"/></clipPath>`,
		);
	}
	const STRIPS = 30,
		V0 = -100,
		V1 = 520,
		sv = (i) => V0 + (i / STRIPS) * (V1 - V0);

	// Wall
	{
		let blocks = "",
			lines = "";
		for (let row = 0, y = -10; y < 432; row++, y += 26) {
			let x = row % 2 ? -34 : -8;
			while (x < 392) {
				const w = 44 + R() * 30,
					q = jq(
						[
							[x, y],
							[x + w, y],
							[x + w, y + 26],
							[x, y + 26],
						],
						1.3,
					);
				blocks += poly(
					q,
					["#2b1e16", "#32231a", "#271a13", "#2f2118", "#36271c"][
						(R() * 5) | 0
					],
				);
				if (R() < 0.55)
					lines += brush(
						[
							[x + 4, y + 4],
							[x + w * 0.3, y + 3.6],
							[x + w * (0.45 + R() * 0.3), y + 4.2],
						],
						1.6,
						BONE_D,
						'opacity=".22"',
					);
				if (R() < 0.5)
					blocks += poly(
						[
							[x + w, y + 26 - 6 - R() * 8],
							[x + w, y + 26],
							[x + w - 10 - R() * 14, y + 26],
						],
						INK,
					);
				lines += `<polygon points="${P(q)}" class="k k2"/>`;
				x += w;
			}
		}
		ink.push(blocks, lines);
	}
	let glowBands = "";
	for (const w of Object.values(WIN)) {
		glowBands += `<path d="${archPath(w.cx, GW / 2 + 62, SPRING, GBOT + 40)}" fill="${w.tint}" opacity=".05"/>`;
		glowBands += `<path d="${archPath(w.cx, GW / 2 + 40, SPRING, GBOT + 26)}" fill="${w.tint}" opacity=".06"/>`;
	}
	function band(y, j, op) {
		const pts = [
			[-10, -10],
			[400, -10],
		];
		for (let x = 400; x >= -10; x -= 13)
			pts.push([x, y + (R() - 0.5) * j * 2 + Math.sin(x * 0.03) * 4]);
		return poly(pts, INK, `opacity="${op}"`);
	}
	const vault = `${band(118, 7, 0.45)}${band(84, 6, 0.75)}${band(54, 5, 1)}
		<path d="M-10 132 Q80 58 195 -8 L195 10 Q90 70 4 148Z" fill="#20160f"/><path d="M400 132 Q310 58 195 -8 L195 10 Q300 70 386 148Z" fill="#20160f"/>
		<path d="M-10 132 Q80 58 195 -8 Q310 58 400 132 M4 148 Q90 70 195 10 Q300 70 386 148" class="k k3"/>`;
	const vaultHatch = poly(
		[
			[-10, 40],
			[400, 40],
			[400, 150],
			[-10, 150],
		],
		"url(#hatch)",
		'class="hz"',
	);

	// Embrasures, sills, hood mouldings, medallions
	let emb = "",
		medalsSVG = "";
	const MEDALS = {};
	for (const [k, w] of Object.entries(WIN)) {
		const r = GW / 2,
			cx = w.cx;
		emb += `<path d="${archPath(cx, r + 30, SPRING, GBOT + 4)}" fill="#3a2a1d"/>`;
		emb += `<path d="${archPath(cx, r + 30, SPRING, GBOT + 4)}" class="k k4"/>`;
		emb += `<path d="${archPath(cx, r + 24, SPRING, GBOT + 4)}" fill="#20160f"/>`;
		emb += `<path d="${archPath(cx, r + 14, SPRING, GBOT + 2)}" fill="#120c09"/>`;
		const shadowLeft = k === "A";
		const rv = archPts(cx, r + 14, SPRING, GBOT + 2, 20),
			ig = archPts(cx, r, SPRING, GBOT, 20);
		const half = (side) => {
			const a = rv.filter(([x]) => (side < 0 ? x <= cx : x >= cx)),
				b = ig.filter(([x]) => (side < 0 ? x <= cx : x >= cx)).reverse();
			return a.concat(b);
		};
		emb += poly(half(shadowLeft ? -1 : 1), INK);
		emb += poly(half(shadowLeft ? 1 : -1), "#3d2a1c");
		emb += `<path d="${archPath(cx, r + 5, SPRING, GBOT)}" fill="none" stroke="${w.tint}" stroke-width="7" opacity=".42"/>`;
		emb += poly(
			half(shadowLeft ? -1 : 1),
			"url(#xhatch)",
			'class="hz" opacity=".8"',
		);
		const sill = jq(
			[
				[w.x0 - 6, GBOT],
				[w.x1 + 6, GBOT],
				[w.x1 + 22, GBOT + 22],
				[w.x0 - 22, GBOT + 22],
			],
			0.8,
		);
		emb +=
			poly(sill, "#5a4430") +
			poly(
				[
					[w.x0 - 6, GBOT],
					[w.x1 + 6, GBOT],
					[w.x1 + 22, GBOT + 22],
					[w.x0 - 22, GBOT + 22],
				],
				w.tint,
				'opacity=".22"',
			);
		emb +=
			`<polygon points="${P(sill)}" class="k k3"/>` +
			poly(
				jq(
					[
						[w.x0 - 22, GBOT + 22],
						[w.x1 + 22, GBOT + 22],
						[w.x1 + 18, GBOT + 31],
						[w.x0 - 18, GBOT + 31],
					],
					1,
				),
				INK,
			);
		emb += `<path d="M${cx - r - 30} ${SPRING} A${r + 30} ${r + 30} 0 0 1 ${cx + r + 30} ${SPRING}" fill="none" stroke="${INK}" stroke-width="12"/><path d="M${cx - r - 30} ${SPRING} A${r + 30} ${r + 30} 0 0 1 ${cx + r + 30} ${SPRING}" fill="none" stroke="#6b5139" stroke-width="5"/><path d="M${cx - r - 30} ${SPRING - 2} A${r + 31} ${r + 31} 0 0 1 ${cx + r + 30} ${SPRING - 2}" fill="none" stroke="${BONE_D}" stroke-width="1.4" opacity=".45"/>`;
		for (const sx of [cx - r - 30, cx + r + 30])
			emb +=
				poly(
					jq(
						[
							[sx - 8, SPRING],
							[sx + 8, SPRING],
							[sx + 6, SPRING + 16],
							[sx - 6, SPRING + 16],
						],
						0.6,
					),
					"#4a3626",
				) +
				`<polygon points="${P([
					[sx - 8, SPRING],
					[sx + 8, SPRING],
					[sx + 6, SPRING + 16],
					[sx - 6, SPRING + 16],
				])}" class="k k3"/>`;
		const pts = [],
			cy = SPRING,
			RR = r + 22,
			side = GBOT - cy,
			arc = Math.PI * RR,
			total = 2 * side + arc;
		for (let i = 0; i < 25; i++) {
			let d = (i / 24) * total;
			if (d <= side) {
				pts.push([cx - RR, GBOT - d]);
				continue;
			}
			d -= side;
			if (d <= arc) {
				const a = Math.PI + d / RR;
				pts.push([cx + Math.cos(a) * RR, cy + Math.sin(a) * RR]);
				continue;
			}
			d -= arc;
			pts.push([cx + RR, cy + d]);
		}
		MEDALS[k] = pts;
		medalsSVG += pts
			.map(
				([x, y], i) =>
					`<g id="m${k}${i}" transform="translate(${f1(x)} ${f1(y)})"><circle r="5.4" fill="#0d0907"/><circle r="4.3" fill="#1a1210" class="mc"/><path d="M-4 1.4 A4.3 4.3 0 0 0 4 1.4Z" fill="#000" opacity="0" class="ms"/><circle r="4.3" class="k" stroke-width="1.3"/><path d="M-4.2 2.8 A5.4 5.4 0 0 0 4.2 2.8" fill="none" stroke="${BONE_D}" stroke-width=".9" opacity=".35"/><circle cx="-1.5" cy="-1.6" r="1.05" fill="${BONE}" opacity="0" class="mh"/><circle r="4.3" fill="#fff3cf" opacity="0" class="mf"/></g>`,
			)
			.join("");
	}
	emb +=
		poly(
			[
				[189, 96],
				[201, 96],
				[201, GBOT + 30],
				[189, GBOT + 30],
			],
			"#4a3626",
		) +
		poly(
			[
				[195, 96],
				[201, 96],
				[201, GBOT + 30],
				[195, GBOT + 30],
			],
			INK,
		);
	emb +=
		poly(
			jq(
				[
					[183, 90],
					[207, 90],
					[204, 102],
					[186, 102],
				],
				0.6,
			),
			"#5a4430",
		) +
		`<polygon points="183,90 207,90 204,102 186,102" class="k k3"/><polygon points="189,96 201,96 201,${GBOT + 30} 189,${GBOT + 30}" class="k k3"/>`;
	const SC = GBOT + 31;
	emb +=
		poly(
			jq(
				[
					[-10, SC],
					[400, SC],
					[400, SC + 12],
					[-10, SC + 12],
				],
				0.8,
			),
			"#5a4430",
		) +
		brush(
			[
				[-4, SC + 2.5],
				[195, SC + 2],
				[394, SC + 2.6],
			],
			2.2,
			BONE_D,
			'opacity=".5"',
		) +
		poly(
			[
				[-10, SC + 12],
				[400, SC + 12],
				[400, SC + 20],
				[-10, SC + 20],
			],
			INK,
		) +
		`<polygon points="-10,${SC} 400,${SC} 400,${SC + 12} -10,${SC + 12}" class="k k3"/>`;
	emb += poly(
		[
			[-10, SC + 20],
			[400, SC + 20],
			[400, SC + 46],
			[-10, SC + 46],
		],
		"url(#hatch)",
		'class="hz" opacity=".6"',
	);
	ink.push(emb);

	// Floor
	const VX = 195,
		FT = 430,
		FH = 414,
		ZF = 4;
	const fy = (Z) => FT + FH * ((1 / Z - 1 / ZF) / (1 - 1 / ZF));
	const fx = (X, Z) => VX + (X - VX) / Z;
	let floorFill = "",
		floorInk = "";
	{
		const rows = [4, 3.25, 2.7, 2.25, 1.9, 1.6, 1.36, 1.17, 1.0, 0.86];
		for (let i = 0; i < rows.length - 1; i++) {
			const Zf = rows[i],
				Zn = rows[i + 1],
				W = 96,
				off = (i % 2) * W * 0.5 + R() * 10;
			for (let X = -700 + off; X < 1100; X += W) {
				const j = 0.6 + (4 - Zf) * 0.5;
				const q = jq(
					[
						[fx(X, Zf), fy(Zf)],
						[fx(X + W, Zf), fy(Zf)],
						[fx(X + W, Zn), fy(Zn)],
						[fx(X, Zn), fy(Zn)],
					],
					j,
				);
				floorFill += poly(
					q,
					["#1b120d", "#20160f", "#18100b", "#23180f", "#1d140e"][
						(R() * 5) | 0
					],
				);
				floorInk += `<polygon points="${P(q)}" class="k k2"/>`;
				if (R() < 0.6)
					floorInk += brush(
						[
							[q[0][0] + 5, q[0][1] + 2.2],
							[lerp(q[0][0], q[1][0], 0.5), lerp(q[0][1], q[1][1], 0.5) + 2],
							[q[1][0] - 8, q[1][1] + 2.2],
						],
						1.4,
						BONE_D,
						'opacity=".16"',
					);
				if (R() < 0.35) {
					const cx0 = lerp(q[0][0], q[2][0], 0.3 + R() * 0.4),
						cy0 = lerp(q[0][1], q[2][1], 0.3 + R() * 0.4);
					floorInk += brush(
						[
							[cx0, cy0],
							[cx0 + 6 + R() * 8, cy0 + 2 + R() * 3],
							[cx0 + 10 + R() * 12, cy0 + R() * 5],
						],
						1.6,
					);
				}
			}
		}
	}
	const floorShadow = (() => {
		let o = "";
		const top = [
			[-10, FT],
			[400, FT],
		];
		for (let x = 400; x >= -10; x -= 12)
			top.push([x, FT + 18 + (R() - 0.5) * 8]);
		o += poly(top, INK);
		o += poly(
			[
				[-10, FT + 14],
				[400, FT + 14],
				[400, FT + 44],
				[-10, FT + 44],
			],
			"url(#hatch)",
			'class="hz"',
		);
		const cl = [
			[-10, 844],
			[-10, 560],
		];
		for (let k = 0; k <= 10; k++) {
			const a = k / 10;
			cl.push([
				lerp(-10, 120, a) + (R() - 0.5) * 10,
				lerp(560, 860, a * a) + (R() - 0.5) * 8,
			]);
		}
		const cr = cl.map(([x, y]) => [390 - x, y]);
		o +=
			poly(
				cl.map(([x, y]) => [x + 22, y]),
				"url(#xhatch)",
				'class="hz"',
			) +
			poly(
				cr.map(([x, y]) => [x - 22, y]),
				"url(#xhatch)",
				'class="hz"',
			);
		o += poly(cl, INK) + poly(cr, INK);
		return o;
	})();
	// The eye on the floor: opens when anyone devours. setView() keeps it above the visible bottom.
	const EYE = { x: 195, y: 806 };
	const floorEye = `<g id="floorEye" transform="translate(${EYE.x} ${EYE.y})" filter="url(#wob)">
		<ellipse rx="46" ry="15" fill="#000" opacity=".22"/>
		<path d="M-32 0 Q0 -20 32 0 Q0 20 -32 0Z" fill="#0d0907" class="k k4"/>
		<path d="M-28 1.5 Q0 16 28 1.5" fill="none" stroke="${BONE_D}" stroke-width="1.3" opacity=".4"/>
		<g id="eyeIris"><ellipse rx="7.5" ry="9.5" fill="#7a171b" class="k k2"/><ellipse rx="2.2" ry="7.6" fill="${INK}"/><ellipse cx="-2.6" cy="-3.4" rx="1.2" ry="1.6" fill="${BONE}" opacity=".45"/></g>
		<path id="eyeLid" d="M-30 0 Q0 -19 30 0 Q0 -19 -30 0Z" fill="#22170f" class="k k3"/>
	</g>`;

	function glassSVG(k) {
		const w = WIN[k],
			sc = GW / 300,
			top = GTOP;
		const sunY = top + 165 * sc;
		const r2 = rng(k === "A" ? 11 : 5);
		let crack = "";
		for (let i = 0; i < 9; i++) {
			const a = (i / 9) * Math.PI * 2 + r2() * 0.5,
				len = 46 + r2() * 46,
				pts = [[w.cx, sunY]];
			for (let s2 = 1; s2 <= 4; s2++)
				pts.push([
					w.cx + Math.cos(a + (r2() - 0.5) * 0.3) * len * (s2 / 4),
					sunY + Math.sin(a + (r2() - 0.5) * 0.3) * len * (s2 / 4),
				]);
			crack +=
				brush(pts, 3.4) +
				brush(
					pts.map(([x, y]) => [x + 1.4, y + 1]),
					0.9,
					BONE,
					'opacity=".7"',
				);
		}
		crack = `<clipPath id="crackClip${k}"><circle id="crackR${k}" cx="${w.cx}" cy="${f1(sunY)}" r="0"/></clipPath><g clip-path="url(#crackClip${k})">${crack}</g>`;
		const cloud = `<g id="cloud${k}" opacity="0"><ellipse cx="0" cy="0" rx="58" ry="22" fill="${INK}"/><ellipse cx="38" cy="-10" rx="34" ry="20" fill="${INK}"/><ellipse cx="-40" cy="6" rx="30" ry="15" fill="${INK}"/></g>`;
		return `<g clip-path="url(#glass${k})">
			<use id="flat${k}" href="#art${k}" transform="translate(${w.x0} ${top}) scale(${sc})"/><use id="grey${k}" href="#art${k}g" opacity="0" transform="translate(${w.x0} ${top}) scale(${sc})"/>
			<g class="screen" id="sun${k}" opacity=".55"><circle cx="${w.cx}" cy="${f1(sunY)}" r="30" fill="${w.tint}" opacity=".35"/><circle cx="${w.cx}" cy="${f1(sunY)}" r="18" fill="#fff4d6" opacity=".55"/></g>
			<g id="flare${k}" class="screen" opacity="0"><circle cx="${w.cx}" cy="${f1(sunY)}" r="64" fill="${BLOOD_L}" opacity=".35"/><circle cx="${w.cx}" cy="${f1(sunY)}" r="40" fill="#ffcf7a" opacity=".55"/><circle cx="${w.cx}" cy="${f1(sunY)}" r="22" fill="#fff7e2" opacity=".8"/></g>
			${cloud}
			<rect id="veil${k}" x="${w.x0 - 2}" y="${top - 2}" width="${GW + 4}" height="${f1(GH + 4)}" fill="${INK}" opacity="0"/>
			${crack}
		</g>
		<path d="${archPath(w.cx, GW / 2, SPRING, GBOT)}" class="k k6"/>`;
	}
	const FIL = [0, 1, 2, 3, 4].map((i) => ({
		y: 548 + i * 13,
		c: (R() - 0.5) * 30,
		col: i % 2 ? "#ff6a4a" : BLOOD_L,
		w: 2 + (i % 3),
		v: 140 + i * 22,
	}));

	$(".scene").innerHTML =
		`<defs>${defs.join("")}</defs>${glassSVG("A")}${glassSVG("B")}${medalsSVG}${floorEye}`;

	// ---------- Bake static ink and window art once ----------
	async function rasterC(svg, w, h) {
		const img = new Image();
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
		await img.decode();
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		c.getContext("2d").drawImage(img, 0, 0, w, h);
		return c;
	}
	const urls = [];
	const toURL = (c) =>
		new Promise((r) =>
			c.toBlob((b) => {
				const u = URL.createObjectURL(b);
				urls.push(u);
				r(u);
			}),
		);
	function filtered(c, f) {
		const o = document.createElement("canvas");
		o.width = c.width;
		o.height = c.height;
		const x = o.getContext("2d");
		x.filter = f;
		x.drawImage(c, 0, 0);
		return o;
	}
	function crimsonOf(c) {
		const o = document.createElement("canvas");
		o.width = c.width;
		o.height = c.height;
		const x = o.getContext("2d");
		x.drawImage(c, 0, 0);
		const im = x.getImageData(0, 0, o.width, o.height),
			d = im.data;
		for (let i = 0; i < d.length; i += 4) {
			const r = d[i],
				g = d[i + 1],
				b = d[i + 2];
			d[i] = Math.min(255, 0.55 * r + 0.7 * g + 0.2 * b + 10);
			d[i + 1] = 0.06 * r + 0.1 * g + 0.03 * b;
			d[i + 2] = 0.06 * r + 0.08 * g + 0.04 * b;
		}
		x.putImageData(im, 0, 0);
		return o;
	}
	function haloOf(tint) {
		const o = document.createElement("canvas");
		o.width = 420;
		o.height = 620;
		const x = o.getContext("2d"),
			arch = new Path2D("M0 420 V150 A150 150 0 0 1 300 150 V420 Z");
		for (const [sc, al] of [
			[1.34, 0.2],
			[1.16, 0.45],
		]) {
			x.setTransform(1, 0, 0, 1, 60, 100);
			x.translate(150, 210);
			x.scale(sc, sc);
			x.translate(-150, -210);
			x.globalAlpha = al;
			x.fillStyle = tint;
			x.fill(arch);
		}
		return o;
	}
	const kcss = () =>
		`<style>.k{fill:none;stroke:${INK};stroke-linejoin:round;stroke-linecap:round}.k2{stroke-width:${2 * LOOK.ink}px}.k3{stroke-width:${3 * LOOK.ink}px}.k4{stroke-width:${4.5 * LOOK.ink}px}.k6{stroke-width:${6 * LOOK.ink}px}.screen{mix-blend-mode:screen}</style>`;
	const doc = (inner) =>
		`<svg xmlns="http://www.w3.org/2000/svg" width="780" height="1688" viewBox="0 0 390 844">${kcss()}<defs>${defs[0]}</defs>${inner}</svg>`;
	const IMG = {};
	let lightDirty = true;
	async function bake() {
		const [b, f] = await Promise.all([
			rasterC(
				doc(
					`<g filter="url(#wob)">${ink[0]}${ink[1]}</g><g class="screen">${glowBands}</g>${vault}<g opacity="${LOOK.hatch}">${vaultHatch}</g><g filter="url(#wob)">${ink[2]}</g>${floorFill}`,
				),
				780,
				1688,
			).then(toURL),
			rasterC(
				doc(
					`<g filter="url(#wob)">${floorInk}</g><g opacity="${LOOK.hatch}">${floorShadow}</g>`,
				),
				780,
				1688,
			).then(toURL),
		]);
		$(".back").src = b;
		$(".front").src = f;
	}
	async function bakeArt() {
		for (const k of ["A", "B"]) {
			const raw = await rasterC(ART[k], 600, 840),
				art = filtered(raw, `brightness(${LOOK.glow})`);
			IMG[k] = { art, crim: crimsonOf(art), halo: haloOf(WIN[k].tint) };
			byId(`art${k}`).setAttribute("href", await toURL(art));
			byId(`art${k}g`).setAttribute(
				"href",
				await toURL(
					filtered(
						raw,
						`saturate(.22) brightness(${(LOOK.glow * 0.62).toFixed(2)})`,
					),
				),
			);
		}
		lightDirty = true;
	}
	const A_ = (n0, n, v) => {
		if (!n0._c) n0._c = {};
		const c = n0._c;
		v = String(v);
		if (c[n] !== v) {
			c[n] = v;
			n0.setAttribute(n, v);
		}
	};

	const GAPI = {};
	async function mountGlass() {
		for (const k of ["A", "B"]) {
			const api = await GL.mount({
				winCanvas: $(`.win${k}`),
				theme: WIN[k].theme,
				seed: WIN[k].seed,
				preset: "locked",
			}).catch((e) => {
				console.error(e);
				return null;
			});
			if (!api) {
				$(`.win${k}`).remove();
				continue;
			}
			if (dead) {
				api.destroy();
				continue;
			}
			GAPI[k] = api;
			A_(byId(`flat${k}`), "opacity", 0);
			A_(byId(`sun${k}`), "opacity", 0);
			A_(byId(`cloud${k}`), "display", "none");
			A_(byId(`flare${k}`), "display", "none");
			A_(byId(`grey${k}`), "display", "none");
		}
	}
	const homeX = (sx) => {
		const wall = VX + (sx - VX) * ZF;
		return wall + (VX - wall) * 0.17;
	};
	const FS = {
		A: { x: homeX(97), i: 0.8, r: 1, c: 0 },
		B: { x: homeX(293), i: 0.8, r: 1, c: 0 },
		drain: { from: 1, amount: 0, phase: 0 },
		look: { zc: 2.75, rz: 1.18, spread: 0.8, caus: 0.34 },
	};
	let floor = null;
	async function mountFloor() {
		floor = await FLOOR.mount({
			canvas: $(".floorC"),
			a: { theme: WIN.A.theme, seed: WIN.A.seed },
			b: { theme: WIN.B.theme, seed: WIN.B.seed },
			zf: ZF,
			vx: VX,
			state: FS,
		}).catch((e) => {
			console.error(e);
			return null;
		});
		if (!floor) $(".floorC").remove();
		else if (dead) floor.stop();
	}

	// ---------- Floor light on one 2D canvas ----------
	const POOL0 = {
		A: { yF: 476, yN: 646, cxF: 108, cxN: 98, wF: 122, wN: 176 },
		B: { yF: 476, yN: 646, cxF: 282, cxN: 292, wF: 122, wN: 176 },
	};
	const DPR = Math.min(2, devicePixelRatio || 1),
		lc = $(".light"),
		lx = lc.getContext("2d");
	lc.width = 390 * DPR;
	lc.height = 844 * DPR;
	const poolC = {
		A: document.createElement("canvas"),
		B: document.createElement("canvas"),
	};
	for (const c of Object.values(poolC)) {
		c.width = lc.width;
		c.height = lc.height;
	}
	function drawPool(k, p, crim) {
		const c = poolC[k],
			x = c.getContext("2d"),
			ay = (p.yF - p.yN) / 420,
			kx = (p.cxF - p.cxN) / 420,
			I = IMG[k];
		x.setTransform(1, 0, 0, 1, 0, 0);
		x.clearRect(0, 0, c.width, c.height);
		for (let i = 0; i < STRIPS; i++) {
			const v0 = sv(i),
				v1 = sv(i + 1),
				s2 = lerp(p.wN, p.wF, sv(i + 0.5) / 420) / 300;
			x.setTransform(
				DPR * s2,
				0,
				DPR * kx,
				DPR * ay,
				DPR * (p.cxN - 150 * s2),
				DPR * p.yN,
			);
			x.globalAlpha = LOOK.halo;
			x.drawImage(
				I.halo,
				0,
				v0 + 100,
				420,
				v1 - v0,
				-60,
				v0,
				420,
				v1 - v0 + 0.3,
			);
			const a0 = Math.max(0, v0),
				a1 = Math.min(420, v1);
			if (a1 > a0) {
				x.globalAlpha = 1;
				x.drawImage(
					I.art,
					0,
					a0 * 2,
					600,
					(a1 - a0) * 2,
					0,
					a0,
					300,
					a1 - a0 + 0.3,
				);
				if (crim > 0.002) {
					x.globalAlpha = crim;
					x.drawImage(
						I.crim,
						0,
						a0 * 2,
						600,
						(a1 - a0) * 2,
						0,
						a0,
						300,
						a1 - a0 + 0.3,
					);
				}
			}
		}
	}
	let lastKey = "",
		lastGeo = "";
	// dir: +1 = light dragged from B into A, -1 = from A into B
	function drawLight(A, B, alA, alB, crA, crB, shA, shB, fon, t, dir) {
		if (!IMG.A || !IMG.B) return;
		const floorOn = !!floor;
		const geo = [
			A.cxF,
			A.wN,
			A.yN,
			B.cxF,
			B.wN,
			crA,
			crB,
			floorOn ? FS.A.x + FS.B.x : 0,
		]
			.map((v) => v.toFixed(3))
			.join();
		const key = geo + [alA, alB, shA, shB].map((v) => v.toFixed(3)).join();
		if (key === lastKey && fon <= 0 && !lightDirty) return;
		if (!floorOn && (geo !== lastGeo || lightDirty)) {
			drawPool("A", A, crA);
			drawPool("B", B, crB);
			lastGeo = geo;
		}
		lastKey = key;
		lightDirty = false;
		lx.setTransform(1, 0, 0, 1, 0, 0);
		lx.clearRect(0, 0, lc.width, lc.height);
		lx.globalCompositeOperation = "lighter";
		if (!floorOn) {
			lx.globalAlpha = clamp(alA);
			lx.drawImage(poolC.A, 0, 0);
			lx.globalAlpha = clamp(alB);
			lx.drawImage(poolC.B, 0, 0);
		}
		lx.setTransform(DPR, 0, 0, DPR, 0, 0);
		for (const [k, p0, al] of [
			["A", A, shA],
			["B", B, shB],
		]) {
			const cs = floorOn ? VX + (FS[k].x - VX) / FS.look.zc : 0,
				p = floorOn ? { ...p0, cxF: cs, cxN: cs, yF: 446, yN: 610 } : p0;
			const w = WIN[k],
				at = (v) => [
					lerp(p.cxN, p.cxF, v / 420),
					lerp(p.yN, p.yF, v / 420),
					lerp(p.wN, p.wF, v / 420) / 2,
				];
			const [c1, y1, h1] = at(150),
				[c2, y2, h2] = at(420);
			lx.fillStyle = w.tint;
			for (const [q, a2] of [
				[
					[
						[w.x0 + 6, SPRING],
						[w.x1 - 6, SPRING],
						[c1 + h1, y1],
						[c1 - h1, y1],
					],
					1,
				],
				[
					[
						[w.x0 + 4, GBOT],
						[w.x1 - 4, GBOT],
						[c2 + h2, y2],
						[c2 - h2, y2],
					],
					0.7,
				],
			]) {
				lx.globalAlpha = clamp(al * a2);
				lx.beginPath();
				q.forEach(([px, py], i) => {
					if (i) lx.lineTo(px, py);
					else lx.moveTo(px, py);
				});
				lx.fill();
			}
		}
		if (fon > 0 && !floorOn) {
			lx.setLineDash([26, 18, 6, 18]);
			lx.lineCap = "round";
			for (const f of FIL) {
				lx.globalAlpha = fon;
				lx.strokeStyle = f.col;
				lx.lineWidth = f.w;
				lx.lineDashOffset = -t * f.v;
				const x0 = dir > 0 ? 300 : 90,
					x1 = dir > 0 ? 104 : 286,
					y = f.y;
				lx.beginPath();
				lx.moveTo(x0, y);
				lx.bezierCurveTo(
					lerp(x0, x1, 0.27),
					y - 22 + f.c,
					lerp(x0, x1, 0.67),
					y + 26 - f.c,
					x1,
					y - 4,
				);
				lx.stroke();
			}
			lx.setLineDash([]);
		}
		lx.globalCompositeOperation = "source-over";
		lx.globalAlpha = 1;
	}

	// ---------- Duel state ----------
	const TL = {
		hush: 1.0,
		reveal: 2.4,
		drain0: 2.55,
		drain1: 4.5,
		tally0: 4.7,
		tally1: 6.3,
		end: 7.2,
	};
	// kind: "devour" (dev devours vic), "kindle" (both Kindle), "ruin" (both Devour), "idle"
	let D = {
		kind: "idle",
		dev: "A",
		vic: "B",
		lit: { A: 0, B: 0 },
		gain: { A: 0, B: 0 },
	};
	const medal = (k, i, on, pop) => {
		const g = byId(`m${k}${i}`);
		A_(g.querySelector(".mc"), "fill", on ? WIN[k].tint : "#1a1210");
		A_(g.querySelector(".mh"), "opacity", on ? 0.8 : 0);
		A_(g.querySelector(".ms"), "opacity", on ? 0.35 : 0);
		A_(
			g.querySelector(".mf"),
			"opacity",
			on && pop < 1 ? ((1 - pop) * 0.9).toFixed(2) : 0,
		);
		const sc = on
			? 1 + 0.32 * Math.max(0, 1 - pop) * Math.sin(Math.min(1, pop) * Math.PI)
			: 1;
		A_(
			g,
			"transform",
			`translate(${MEDALS[k][i][0].toFixed(1)} ${MEDALS[k][i][1].toFixed(1)}) scale(${sc.toFixed(3)})`,
		);
	};
	function render(t) {
		const idle = D.kind === "idle";
		const hush = idle
			? 0
			: smooth(TL.hush, TL.hush + 0.8, t) *
				(1 - smooth(TL.reveal - 0.1, TL.reveal + 0.05, t));
		const rv = t - TL.reveal,
			hit = !idle && t >= TL.reveal;
		const drag = idle
			? 0
			: reduce
				? hit
					? 1
					: 0
				: smooth(TL.drain0, TL.drain1, t);
		const dv = D.kind === "devour",
			kin = D.kind === "kindle",
			ruin = D.kind === "ruin";
		for (const k of ["A", "B"]) {
			const c = byId(`cloud${k}`),
				x =
					WIN[k].cx +
					lerp(-110, 110, clamp((t - TL.hush) / 1.6)) * (k === "A" ? 1 : -1);
			A_(
				c,
				"transform",
				`translate(${x.toFixed(1)} ${(SPRING + 4).toFixed(1)})`,
			);
			A_(c, "opacity", (0.55 * hush).toFixed(2));
		}
		const kc = clamp((t - (TL.hush - 0.2)) / (TL.reveal - TL.hush + 0.2)),
			cx = idle ? -0.7 : lerp(-0.7, 3.2, kc);
		const pool = { A: { ...POOL0.A }, B: { ...POOL0.B } },
			al = {},
			cr = {},
			sh = {};
		const dimF = 1 - hush * 0.75,
			ci = 0.8 * LOOK.caustic * (1 - hush * 0.75);
		for (const k of ["A", "B"]) {
			const isDev = dv && k === D.dev,
				isVic = dv && k === D.vic;
			const flare =
				hit && (isDev || ruin)
					? (reduce ? 0.7 : Math.max(ruin ? 0.35 : 0.65, 1 - rv * 0.6)) *
						(ruin ? 0.6 : 1)
					: 0;
			const fall = isVic ? drag : ruin ? drag * 0.6 : 0,
				rise = kin ? drag : isDev ? drag * 0.35 : 0;
			A_(byId(`flare${k}`), "opacity", flare.toFixed(2));
			A_(
				byId(`veil${k}`),
				"opacity",
				(GAPI[k] ? fall * 0.15 : hush * 0.55 + fall * 0.5).toFixed(2),
			);
			A_(byId(`grey${k}`), "opacity", (fall * 0.85).toFixed(2));
			if (!GAPI[k])
				A_(
					byId(`sun${k}`),
					"opacity",
					Math.min(
						1,
						0.55 * (1 - fall * 0.8) * (1 - hush * 0.6) * (1 + rise * 0.6),
					).toFixed(2),
				);
			const g = GAPI[k];
			if (g) {
				g.cloud(k === "A" ? cx : cx - 1.53);
				g.dim(Math.min(0.9, hush * 0.25 + fall * 0.6));
				g.red(hit && (isDev || ruin) ? (ruin ? 0.35 : 0.55) : 0);
			}
			if (floor) {
				FS[k].i = ci * (1 + rise * 0.35) * (1 - fall * 0.75);
				FS[k].c = isVic
					? Math.min(1, drag * 1.4)
					: isDev
						? drag * 0.35
						: ruin
							? drag * 0.7
							: 0;
				FS[k].r = 1 + rise * 0.15 - fall * 0.4;
				FS[k].x = isVic
					? lerp(homeX(WIN[k].cx), homeX(WIN[D.dev].cx), drag * 0.55)
					: homeX(WIN[k].cx);
			}
			A_(
				byId(`crackR${k}`),
				"r",
				hit && (isVic || ruin)
					? (reduce ? 120 : 120 * outExp(clamp(rv / 0.22))).toFixed(1)
					: 0,
			);
			// floor pools
			const p = pool[k],
				mir = k === "A" ? (x) => 390 - x : (x) => x;
			if (isDev || kin) {
				p.wN += drag * (kin ? 14 : 26);
				p.wF += drag * 10;
				p.yN += drag * 10;
			}
			if (isVic) {
				p.cxF = lerp(p.cxF, mir(168), drag);
				p.cxN = lerp(p.cxN, mir(150), drag);
				p.wF = lerp(p.wF, 54, drag);
				p.wN = lerp(p.wN, 84, drag);
			}
			if (ruin) {
				p.wF = lerp(p.wF, 96, drag);
				p.wN = lerp(p.wN, 130, drag);
			}
			al[k] =
				LOOK.pool *
				dimF *
				(isDev
					? 1 + drag * 0.12
					: isVic
						? 1 - drag * 0.55
						: kin
							? 1 + drag * 0.3
							: ruin
								? 1 - drag * 0.45
								: 1);
			cr[k] = isDev
				? drag * 0.45
				: isVic
					? Math.min(1, drag * 1.6)
					: ruin
						? drag * 0.8
						: 0;
			sh[k] =
				LOOK.shaft *
				dimF *
				(isVic
					? 1 - drag * 0.7
					: kin
						? 1 + drag * 0.6
						: ruin
							? 1 - drag * 0.5
							: 1);
		}
		if (floor) {
			FS.drain.from = D.vic === "B" ? 1 : 0;
			FS.drain.amount =
				hit && dv
					? smooth(TL.reveal, TL.drain0 + 0.3, t) *
						(1 - smooth(TL.drain1 - 0.2, TL.drain1 + 0.6, t))
					: 0;
			FS.drain.phase = t;
		}
		const fon =
			hit && dv
				? smooth(TL.reveal, TL.drain0 + 0.2, t) *
					(1 - smooth(TL.drain1 - 0.3, TL.drain1 + 0.4, t))
				: 0;
		drawLight(
			pool.A,
			pool.B,
			al.A,
			al.B,
			cr.A,
			cr.B,
			sh.A,
			sh.B,
			fon,
			t,
			D.vic === "B" ? 1 : -1,
		);
		// the floor eye opens when anyone devours
		const lid =
			hit && !kin ? (reduce ? 1 : outExp(clamp((rv - 0.05) / 0.3))) : 0;
		A_(
			byId("eyeLid"),
			"d",
			`M-30 0 Q0 -19 30 0 Q0 ${(-19 + 38 * (1 - lid)).toFixed(1)} -30 0Z`,
		);
		A_(byId("eyeIris"), "opacity", lid.toFixed(2));
		// tally: each side's Light medallions pop one by one
		for (const k of ["A", "B"]) {
			const base = D.lit[k],
				g = D.gain[k],
				gained = idle
					? 0
					: Math.floor(
							clamp((t - TL.tally0) / (TL.tally1 - TL.tally0)) * (g + 0.0001),
						);
			for (let i = 0; i < 25; i++) {
				const on = i < base + gained;
				const popT =
					g > 0 && i >= base
						? (t - (TL.tally0 + ((i - base) / g) * (TL.tally1 - TL.tally0))) /
							0.35
						: 9;
				medal(k, i, on, reduce ? 9 : popT);
			}
		}
	}

	// ---------- Clock and beats ----------
	// The screen hangs its DOM (masks, verdict, flash, shake, tallies) on these beats.
	const BEATS = [
		["hush", TL.hush],
		["reveal", TL.reveal],
		["tally", TL.tally0],
		["end", TL.end],
	];
	let t = 0,
		last = performance.now(),
		freeze = 0,
		crossed = false,
		speed = 1,
		beat = 0,
		raf = 0,
		done = null,
		ready = false,
		eyeY = EYE.y;
	const rate = () => LOOK.speed * speed;
	function emit(name) {
		try {
			opts.onBeat?.(name, {
				kind: D.kind,
				rate: rate(),
				/** Seconds (wall clock) from this beat to the next one at the current rate. */
				until: (() => {
					const i = BEATS.findIndex(([n]) => n === name);
					const next = BEATS[i + 1];
					return next ? (next[1] - BEATS[i][1]) / rate() : 0;
				})(),
			});
		} catch (e) {
			console.error("[stage] beat", e);
		}
	}
	function settle() {
		if (done) {
			const d = done;
			done = null;
			d();
		}
	}
	function tick(now) {
		if (dead) return;
		let dt = Math.min(0.2, (now - last) / 1000);
		last = now;
		if (!ready || document.hidden) dt = 0;
		if (now < freeze) dt = 0;
		if (D.kind !== "idle") {
			const before = t;
			t = Math.min(TL.end + 2, t + dt * rate());
			if (!crossed && before < TL.reveal && t >= TL.reveal) {
				crossed = true;
				// hit-stop: hold the frame on the unveiling (the screen slams its verdict in this pause)
				t = TL.reveal;
				if (!reduce && speed < 2) freeze = now + LOOK.hitstop;
				if (D.kind === "devour") GAPI[D.dev]?.swell();
				if (D.kind === "kindle") {
					GAPI.A?.swell();
					GAPI.B?.swell();
				}
			}
			while (beat < BEATS.length && t >= BEATS[beat][1]) emit(BEATS[beat++][0]);
			if (t >= TL.end) settle();
		}
		render(t);
		raf = requestAnimationFrame(tick);
	}

	await Promise.all([bake(), bakeArt(), mountGlass(), mountFloor()]);
	ready = true;
	last = performance.now();
	if (!dead) el.classList.add("on");
	raf = requestAnimationFrame(tick);

	const litOf = (s) =>
		Math.max(0, Math.min(25 - Math.min(25, s.gain || 0), s.lit || 0));

	return {
		/** Fixed world geometry, so the screen can lay its DOM over the drawing. */
		geom: {
			W: SW,
			H: SH,
			GW,
			GH,
			GTOP,
			GBOT,
			SPRING,
			SC,
			FT,
			pier: VX,
			win: { A: { cx: WIN.A.cx }, B: { cx: WIN.B.cx } },
			tint: { A: WIN.A.tint, B: WIN.B.tint },
		},
		/** Show a pair at rest (no outcome). */
		setPair(a, b) {
			D = {
				kind: "idle",
				dev: "A",
				vic: "B",
				lit: { A: litOf(a), B: litOf(b) },
				gain: { A: 0, B: 0 },
			};
			t = 0;
			beat = 0;
			crossed = false;
			freeze = 0;
			lightDirty = true;
			settle();
		},
		/**
		 * Play one duel. Resolves when the outcome has settled ("end" beat); the final tableau
		 * stays on stage until the next call.
		 */
		play(duel) {
			settle();
			const ma = duel.a.move,
				mb = duel.b.move;
			const kind =
				ma === 0 && mb === 0
					? "kindle"
					: ma === 1 && mb === 1
						? "ruin"
						: "devour";
			const dev = ma === 1 && mb === 0 ? "A" : "B";
			D = {
				kind,
				dev,
				vic: dev === "A" ? "B" : "A",
				lit: { A: litOf(duel.a), B: litOf(duel.b) },
				gain: {
					A: Math.min(25, duel.a.gain || 0),
					B: Math.min(25, duel.b.gain || 0),
				},
			};
			speed = duel.speed || 1;
			t = 0;
			beat = 0;
			crossed = false;
			freeze = 0;
			lightDirty = true;
			return new Promise((r) => {
				done = r;
			});
		},
		/** A tap: hasten to the unveiling, or past it to the settled outcome. */
		skip() {
			if (D.kind === "idle" || t >= TL.end) return;
			if (t < TL.reveal - 0.35) t = TL.reveal - 0.35;
			else if (t >= TL.reveal) {
				t = TL.end;
				freeze = 0;
			}
		},
		/** The world rows the caller can see; keeps the floor eye above the visible bottom. */
		setView({ bottom }) {
			const y = Math.round(Math.max(600, Math.min(EYE.y, bottom - 96)));
			if (y === eyeY) return;
			eyeY = y;
			A_(byId("floorEye"), "transform", `translate(${EYE.x} ${y})`);
		},
		destroy() {
			dead = true;
			cancelAnimationFrame(raf);
			settle();
			GAPI.A?.destroy();
			GAPI.B?.destroy();
			floor?.stop();
			for (const c of el.querySelectorAll("canvas")) {
				try {
					c.getContext("webgl2")
						?.getExtension("WEBGL_lose_context")
						?.loseContext();
				} catch {
					/* 2d canvas */
				}
			}
			for (const u of urls) URL.revokeObjectURL(u);
			el.remove();
		},
	};
}
