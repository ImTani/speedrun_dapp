// The seven Aspect masks as SVG markup (mask space: viewBox 0 0 100 84).
// Mercy = Volto, Hunger = Bauta, Echo = Colombina, Rancour = Pantalone, Appetite = Arlecchino,
// Inquisitor = Medico della Peste, Madness = Jolly.
//
// Forms: game-icons.net silhouettes (CC BY 3.0, Lorc and Delapouite), re-fitted into one mask
// space by src/ui/masks/tools/build-geometry.mjs. Look: one shared treatment for all seven:
// material gradient lit from the upper left, carved relief (SVG lighting), age grime, ink
// hatching in the shadow side and one ink outline weight. Credits: public/ATTRIBUTION.md.
//
// Pure ESM, no DOM access: safe to call during server render, in the browser and in Node.

import { GEOMETRY } from "../ui/masks/geometry.js";

export const ASPECT_KEYS = [
	"mercy",
	"hunger",
	"echo",
	"rancour",
	"appetite",
	"inquisitor",
	"madness",
];

const ASPECTS = {
	mercy: "Mercy",
	hunger: "Hunger",
	echo: "Echo",
	rancour: "Rancour",
	appetite: "Appetite",
	inquisitor: "Inquisitor",
	madness: "Madness",
};

const INK = "#0b0a10";
const PAPER = "#efe4c9";

/** Materials: [highlight, base, shadow]. */
const MAT = {
	bone: ["#fff9ec", "#e9dcc1", "#9a8262"],
	ivory: ["#f7ecd3", "#d8c49c", "#7f6644"],
	gold: ["#ffeaa6", "#d0a54c", "#5f4316"],
	brass: ["#f0cb7c", "#a87b31", "#3f2a0e"],
	silver: ["#ffffff", "#c3c8d1", "#565b69"],
	leather: ["#be8253", "#7a432a", "#2a130a"],
	ash: ["#7a6a60", "#3d322e", "#121013"],
	felt: ["#5a5160", "#28232e", "#0c0a10"],
	lacquer: ["#615b6b", "#221e28", "#08070b"],
	crimson: ["#ee7180", "#a8192f", "#3f050d"],
	verdigris: ["#6cc8a2", "#1f7a59", "#062b1c"],
	amber: ["#ffd77a", "#da9620", "#643a05"],
	violet: ["#a77fe0", "#55318d", "#1a0c31"],
};

const hex = (h) =>
	[1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
const toHex = (c) =>
	`#${c
		.map((v) =>
			Math.round(Math.max(0, Math.min(1, v)) * 255)
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
const lum = (h) => {
	const [r, g, b] = hex(h);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (a, b, t) => {
	const A = hex(a),
		B = hex(b);
	return toHex(A.map((v, i) => v + (B[i] - v) * t));
};

// Grisaille: the brown monochrome the glass painters used. Tone comes from the material.
const G_DARK = "#2a180d",
	G_MID = "#86603c",
	G_LIGHT = "#ecdcbb";
function grisaille(m) {
	const t = lum(MAT[m][1]);
	const at = (v) =>
		v < 0.5
			? mix(G_DARK, G_MID, Math.max(0, v) * 2)
			: mix(G_MID, G_LIGHT, Math.min(1, (v - 0.5) * 2));
	return [at(t + 0.28), at(t), at(t - 0.32)];
}

/** Ink treatment of a material: "paper", "mid" (paper + hatching) or "ink". */
function inkTone(m) {
	const t = lum(MAT[m][1]);
	return t > 0.55 ? "paper" : t < 0.22 ? "ink" : "mid";
}

let uid = 0;
const r = (v) => Math.round(v * 100) / 100;

/**
 * An Aspect mask as an SVG string.
 * @param {string} aspect  aspect key ("mercy" .. "madness")
 * @param {number} [width] rendered width in px (height = width * 0.84)
 * @param {string | {variant?: "gilded"|"grisaille"|"ink", glow?: boolean, still?: boolean, void?: boolean, fit?: "space"|"square", title?: string, id?: string}} [opts]
 *   variant: material treatment (default gilded); glow: ember eyes (flicker unless still);
 *   void: dark behind the eye holes; fit "square": a size x size box framed tightly on this
 *   mask (chips, heroes) instead of the shared 100 x 84 mask space (the scene).
 */
function mask(aspect, width = 60, opts = {}) {
	const o = typeof opts === "string" ? { variant: opts } : opts || {};
	const variant =
		o.variant === "grisaille" || o.variant === "ink" ? o.variant : "gilded";
	const geo = GEOMETRY[aspect] ?? GEOMETRY.mercy;
	const ai = Math.max(0, ASPECT_KEYS.indexOf(aspect));
	const u = ++uid;
	// A caller-supplied suffix keeps ids stable between server and client renders.
	const sfx = o.id ? String(o.id).replace(/\W/g, "") : String(u);
	const id = (s) => `${s}${sfx}`;
	const url = (s) => `url(#${id(s)})`;
	const ink = variant === "ink";
	const line = variant === "grisaille" ? "#1e1209" : INK;
	const defs = [];
	const used = new Set();

	const colors = (m) => (variant === "grisaille" ? grisaille(m) : MAT[m]);
	const grad = (m) => {
		if (!used.has(m)) {
			used.add(m);
			const [hi, base, lo] = colors(m);
			defs.push(
				`<radialGradient id="${id(`g${m}`)}" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`,
			);
		}
		return url(`g${m}`);
	};
	const fillOf = (m) => {
		if (!ink) return grad(m);
		const t = inkTone(m);
		return t === "ink" ? INK : PAPER;
	};

	// Shared defs: hatching, carved-relief filters (big for bodies, small for reliefs).
	const hatchW = ink ? 1.7 : 1.9;
	defs.push(
		`<pattern id="${id("h")}" width="${hatchW}" height="${hatchW}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0V${hatchW}" stroke="${INK}" stroke-width="${ink ? 0.7 : 0.55}"/></pattern>`,
		`<pattern id="${id("hp")}" width="1.9" height="1.9" patternUnits="userSpaceOnUse" patternTransform="rotate(52)"><path d="M0 0V1.9" stroke="${PAPER}" stroke-width=".5"/></pattern>`,
	);
	if (!ink) {
		const grim = variant === "grisaille" ? [-1.5, 0.86] : [-1.15, 0.64];
		const relief = (name, blur, scale, spec) =>
			`<filter id="${id(name)}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">` +
			`<feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>` +
			`<feDiffuseLighting in="b" surfaceScale="${scale}" diffuseConstant="1.04" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="54"/></feDiffuseLighting>` +
			`<feSpecularLighting in="b" surfaceScale="${scale}" specularConstant="${spec}" specularExponent="34" lighting-color="#fff2d2" result="s"><feDistantLight azimuth="235" elevation="54"/></feSpecularLighting>` +
			`<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.16" result="l"/>` +
			`<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>` +
			`<feComposite in="l" in2="s2" operator="arithmetic" k2="1" k3=".6" result="o"/>` +
			`<feTurbulence type="fractalNoise" baseFrequency=".075 .06" numOctaves="3" seed="${ai + 3}" result="n"/>` +
			`<feColorMatrix in="n" type="matrix" values="0 0 0 0 .24  0 0 0 0 .15  0 0 0 0 .08  0 0 0 ${grim[0]} ${grim[1]}" result="g"/>` +
			`<feComposite in="g" in2="SourceAlpha" operator="in" result="g2"/>` +
			`<feBlend in="g2" in2="o" mode="multiply"/></filter>`;
		defs.push(relief("fb", 0.9, 1.7, 0.7), relief("fr", 0.45, 1.2, 0.9));
	}

	// Eye embers sit under the mask and show through the eye holes.
	const eyes = geo.eyes;
	const er = geo.eyeR ?? [6, 4];
	let under = "",
		over = "";
	if (o.glow) {
		defs.push(
			`<radialGradient id="${id("e")}"><stop offset="0" stop-color="#fff0c0"/><stop offset=".16" stop-color="#ffb04a"/><stop offset=".42" stop-color="#c8361a"/><stop offset=".78" stop-color="#3d0907"/><stop offset="1" stop-color="#140404"/></radialGradient>`,
			`<radialGradient id="${id("eh")}"><stop offset="0" stop-color="#ff8a3a" stop-opacity=".55"/><stop offset=".5" stop-color="#d2401a" stop-opacity=".16"/><stop offset="1" stop-color="#d2401a" stop-opacity="0"/></radialGradient>`,
		);
		const flick = o.still
			? ""
			: `<animate attributeName="opacity" values="1;.78;.95;.84;1" keyTimes="0;.3;.5;.8;1" dur="${(2.4 + (ai % 5) * 0.23).toFixed(2)}s" repeatCount="indefinite"/>`;
		under = `<g>${flick}${eyes
			.map(
				([x, y]) =>
					`<ellipse cx="${x}" cy="${y}" rx="${er[0] * 1.15}" ry="${er[1] * 1.3}" fill="${url("e")}"/>`,
			)
			.join("")}</g>`;
		over = `<g style="mix-blend-mode:screen" opacity=".7">${flick}${eyes
			.map(
				([x, y]) =>
					`<circle cx="${x}" cy="${y}" r="${Math.max(er[0], er[1]) * 1.7}" fill="${url("eh")}"/>`,
			)
			.join("")}</g>`;
	} else if (o.void) {
		under = eyes
			.map(
				([x, y]) =>
					`<ellipse cx="${x}" cy="${y}" rx="${er[0] * 1.2}" ry="${er[1] * 1.2}" fill="${INK}"/>`,
			)
			.join("");
	}

	const layers = geo.layers;
	const body = [];
	layers.forEach((L, i) => {
		if (L.role === "inlay") return; // drawn inside the layer it clips to
		if (L.role === "engrave") {
			body.push(
				`<path d="${L.d}" fill="${ink ? INK : line}" opacity="${ink ? 1 : 0.92}"/>`,
			);
			return;
		}
		const isBody = L.role === "body";
		const tone = ink ? inkTone(L.mat) : "";
		const parts = [];
		if (L.holes)
			defs.push(
				`<mask id="${id(`m${i}`)}" maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="94"><path d="${L.d}" fill="#fff"/><path d="${L.holes}" fill="#000"/></mask>`,
			);
		// base fill (Echo's body splits gold | silver down the middle)
		if (L.split && !ink) {
			defs.push(
				`<clipPath id="${id(`l${i}`)}"><rect x="-5" y="-5" width="${L.split + 5}" height="94"/></clipPath><clipPath id="${id(`r${i}`)}"><rect x="${L.split}" y="-5" width="${105 - L.split}" height="94"/></clipPath>`,
			);
			parts.push(
				`<path d="${L.d}" fill="${grad(L.mat)}" clip-path="${url(`l${i}`)}"/><path d="${L.d}" fill="${grad(L.mat2)}" clip-path="${url(`r${i}`)}"/>`,
			);
		} else parts.push(`<path d="${L.d}" fill="${fillOf(L.mat)}"/>`);
		if (ink && tone === "mid")
			parts.push(`<path d="${L.d}" fill="${url("h")}"/>`);
		// inlays clipped to this layer
		layers.forEach((I) => {
			if (I.role !== "inlay" || layers[I.clip] !== L) return;
			if (!defs.some((d) => d.includes(`id="${id(`c${i}`)}"`)))
				defs.push(
					`<clipPath id="${id(`c${i}`)}"><path d="${L.d}"/></clipPath>`,
				);
			const t = ink ? inkTone(I.mat) : "";
			const f = ink
				? t === "paper"
					? PAPER
					: t === "ink"
						? INK
						: url("h")
				: grad(I.mat);
			parts.push(
				`<path d="${I.d}" fill="${f}" stroke="${line}" stroke-width="${ink ? 0.7 : 0.45}" stroke-linejoin="round" clip-path="${url(`c${i}`)}"/>`,
			);
		});
		// shadow-side hatching: the shape minus itself nudged towards the light
		const off = isBody ? (ink ? [-2.6, -3] : [-4.2, -5]) : [-1.1, -1.3];
		const sm = (name, dx, dy) =>
			defs.push(
				`<mask id="${id(name)}" maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="94"><path d="${L.d}" fill="#fff"/><path d="${L.d}" fill="#000" transform="translate(${dx} ${dy})"/></mask>`,
			);
		if (tone === "ink") {
			// dark ink shapes get paper hatching on the lit side instead
			sm(`s${i}`, -off[0], -off[1]);
			parts.push(
				`<path d="${L.d}" fill="${url("hp")}" mask="${url(`s${i}`)}"/>`,
			);
		} else {
			sm(`s${i}`, off[0], off[1]);
			parts.push(
				`<path d="${L.d}" fill="${url("h")}" mask="${url(`s${i}`)}" opacity="${ink ? 1 : 0.3}"/>`,
			);
		}
		let g = parts.join("");
		if (L.holes) g = `<g mask="${url(`m${i}`)}">${g}</g>`;
		if (!ink) g = `<g filter="${url(isBody ? "fb" : "fr")}">${g}</g>`;
		const w = ink ? (isBody ? 2 : 1.2) : isBody ? 1.35 : 0.8;
		const stroke = ink && tone === "ink" ? PAPER : line;
		const outline = `<path d="${L.d}${L.holes ?? ""}" fill="none" stroke="${stroke}" stroke-width="${L.trim && !ink ? w * 1.6 : w}" stroke-linejoin="round"${ink && tone === "ink" ? ' opacity=".9"' : ""}/>`;
		// dark ink layers keep a black silhouette edge under the paper line
		const edge =
			ink && tone === "ink"
				? `<path d="${L.d}" fill="none" stroke="${INK}" stroke-width="${w + 1.6}" stroke-linejoin="round"/>`
				: "";
		const trim =
			L.trim && !ink
				? `<path d="${L.d}" fill="none" stroke="${colors(L.trim)[1]}" stroke-width="${w * 0.6}" stroke-linejoin="round"/>`
				: "";
		// soft reliefs (a nose ridge in the same material) melt into the face: no hard outline
		body.push(L.soft && !ink ? g : edge + g + outline + trim);
	});

	const title = o.title
		? `<title>${String(o.title).replace(/[<&]/g, "")}</title>`
		: "";
	const aria = o.title ? 'role="img"' : 'aria-hidden="true"';
	let h = Math.round((width * 84) / 100),
		vb = "0 0 100 84";
	if (o.fit === "square" && geo.box) {
		const [x0, y0, x1, y1] = geo.box;
		const side = Math.max(x1 - x0, y1 - y0) + 6;
		const cx = (x0 + x1) / 2,
			cy = (y0 + y1) / 2;
		vb = `${r(cx - side / 2)} ${r(cy - side / 2)} ${r(side)} ${r(side)}`;
		h = width;
	}
	return `<svg class="mask mask-${aspect}" width="${width}" height="${h}" viewBox="${vb}" ${aria}>${title}<defs>${defs.join("")}</defs>${under}${body.join("")}${over}</svg>`;
}

/** Eye centres per mask, in mask space (viewBox 0 0 100 84), for the scene's ember eyes. */
const EYES = Object.fromEntries(
	Object.entries(GEOMETRY).map(([k, v]) => [k, v.eyes]),
);

export const MASK = { mask, ASPECTS, EYES, KEYS: ASPECT_KEYS };

// Older mocks read the API from window.MASK.
if (typeof window !== "undefined") window.MASK = MASK;
