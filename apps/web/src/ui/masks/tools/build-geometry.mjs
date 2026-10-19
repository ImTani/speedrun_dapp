// Builds src/ui/masks/geometry.js from the licensed source icons in public/masks/src/.
// Run from apps/web:  node src/ui/masks/tools/build-geometry.mjs
// then format the output: biome format --write src/ui/masks/geometry.js
//
// Each Aspect mask is assembled from game-icons.net silhouettes (CC BY 3.0, Lorc and
// Delapouite; see public/ATTRIBUTION.md). The source subpaths are re-fitted into the
// shared 100 x 84 mask space so every mask has the same line weight and framing, then
// the renderer (src/scene/masks.js) gives all seven one material, light and ink style.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	bbox,
	center,
	circlePath,
	parse,
	split,
	stringify,
	transform,
} from "./pathkit.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "../../../..");
const SRC = path.join(web, "public/masks/src");
const OUT = path.join(web, "src/ui/masks/geometry.js");

/** All subpaths (absolute segments) of a game-icons file, minus its black backdrop square. */
function load(name) {
	const svg = fs.readFileSync(path.join(SRC, `${name}.svg`), "utf8");
	const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)]
		.map((m) => m[1])
		.filter((d) => !/^M0 0h512v512H0z$/i.test(d));
	return ds.flatMap((d) => split(parse(d)));
}

/**
 * Fit a source (all of its listed subpaths) into a target box, uniform scale, centred.
 * Returns a mapper that transforms any subpath of that source with the same fit.
 */
function fitter(subs, ids, box, align = "center") {
	const segs = ids.flatMap((i) => subs[i]);
	const [x0, y0, x1, y1] = bbox(segs);
	const [bx0, by0, bx1, by1] = box;
	const s = Math.min((bx1 - bx0) / (x1 - x0), (by1 - by0) / (y1 - y0));
	const tx = (bx0 + bx1) / 2 - ((x0 + x1) / 2) * s;
	const ty =
		align === "top"
			? by0 - y0 * s
			: align === "bottom"
				? by1 - y1 * s
				: (by0 + by1) / 2 - ((y0 + y1) / 2) * s;
	const map = (i) => transform(subs[i], s, tx, ty);
	return {
		s,
		map,
		d: (list) => list.map((i) => stringify(map(i))).join(""),
		c: (i) => center(map(i)),
		box: (i) => bbox(map(i)),
	};
}

const r2 = (v) => Math.round(v * 100) / 100;
const eyesOf = (F, a, b) => [F.c(a).map(r2), F.c(b).map(r2)];
/** Half extents of the larger eye hole (for the ember behind it). */
const eyeR = (F, ids) => {
	let rx = 0,
		ry = 0;
	for (const i of ids) {
		const [x0, y0, x1, y1] = F.box(i);
		rx = Math.max(rx, (x1 - x0) / 2);
		ry = Math.max(ry, (y1 - y0) / 2);
	}
	return [r2(rx), r2(ry)];
};

const G = {};

// ---- 0 Mercy: Volto. Lorc "curly mask": the full face, its eyes cut, the curls gilded.
{
	const S = load("lorc_curly-mask");
	const F = fitter(S, [0], [10, 2, 90, 82]);
	G.mercy = {
		layers: [
			{ role: "body", mat: "bone", d: F.d([0]), holes: F.d([6, 7]) },
			{ role: "relief", mat: "gold", d: F.d([2, 3, 4, 5]) },
			{ role: "relief", mat: "gold", d: F.d([8, 9]) },
		],
		eyes: eyesOf(F, 6, 7),
		eyeR: eyeR(F, [6, 7]),
	};
}

// ---- 1 Hunger: Bauta. Lorc "architect mask" (the jutting, mouthless face) under the
// tricorn from Delapouite "pirate hat" (hat body only, the skull emblem dropped).
// The almond eye holes and the nose ridge are drawn here, centred on Lorc's eye rings.
{
	const S = load("lorc_architect-mask");
	const F = fitter(S, [0], [26, 14, 74, 83]);
	const H = load("delapouite_pirate-hat");
	const T = fitter(H, [1], [6, 1, 94, 40], "top");
	const [ax, ay] = F.c(3),
		[bx, by] = F.c(4);
	const almond = (x, y, w, h, inner) =>
		`M${r2(x - w / 2)} ${r2(y - (inner < 0 ? 0 : 1))}Q${r2(x)} ${r2(y - h)} ${r2(x + w / 2)} ${r2(y - (inner > 0 ? 0 : 1))}Q${r2(x)} ${r2(y + h * 0.75)} ${r2(x - w / 2)} ${r2(y - (inner < 0 ? 0 : 1))}Z`;
	const mx = (ax + bx) / 2;
	const nose = `M${r2(mx - 1.6)} ${r2(ay + 1)}C${r2(mx - 2)} ${r2(ay + 9)} ${r2(mx - 4.6)} ${r2(ay + 15)} ${r2(mx - 4.2)} ${r2(ay + 17.5)}Q${r2(mx)} ${r2(ay + 19.5)} ${r2(mx + 4.2)} ${r2(ay + 17.5)}C${r2(mx + 4.6)} ${r2(ay + 15)} ${r2(mx + 2)} ${r2(ay + 9)} ${r2(mx + 1.6)} ${r2(ay + 1)}Z`;
	G.hunger = {
		layers: [
			{
				role: "body",
				mat: "bone",
				d: F.d([0]),
				holes: almond(ax, ay, 12, 5.2, 1) + almond(bx, by, 12, 5.2, -1),
			},
			{ role: "relief", mat: "bone", soft: true, d: nose },
			{ role: "body", mat: "felt", trim: "gold", d: T.d([1]) },
		],
		eyes: [
			[r2(ax), r2(ay)],
			[r2(bx), r2(by)],
		],
		eyeR: [6, 3.2],
	};
}

// ---- 2 Echo: Colombina. Delapouite "carnival mask": half mask, plumes and ribbons.
// The mirror: the left half is gold, the right half silver.
{
	const S = load("delapouite_carnival-mask");
	const F = fitter(S, [0, 1, 2, 3, 4], [2, 12, 98, 74]);
	G.echo = {
		layers: [
			{ role: "relief", mat: "gold", d: F.d([1, 3]) },
			{ role: "relief", mat: "silver", d: F.d([0, 2]) },
			{
				role: "body",
				mat: "gold",
				mat2: "silver",
				split: 50,
				d: F.d([4]),
				holes: F.d([5, 6]),
			},
		],
		eyes: eyesOf(F, 6, 5),
		eyeR: eyeR(F, [5, 6]),
	};
}

// ---- 3 Rancour: Pantalone. Lorc "domino mask" in old leather, and the merchant's moustache
// from Delapouite "mustache" (moustache only). The hooked nose, nostrils and the knitted
// brows are small shapes drawn here, in-house.
{
	const S = load("lorc_domino-mask");
	const F = fitter(S, [0], [8, 3, 92, 49]);
	const M = load("delapouite_mustache");
	const T = fitter(M, [2], [14, 55, 86, 79], "top");
	const [lx, ly] = F.c(1),
		[rx] = F.c(2);
	const n = (lx + rx) / 2;
	const y0 = ly - 6;
	const nose = `M${r2(n - 3)} ${r2(y0)}C${r2(n - 3.6)} ${r2(y0 + 14)} ${r2(n - 6.4)} ${r2(y0 + 26)} ${r2(n - 6.8)} ${r2(y0 + 33)}C${r2(n - 7)} ${r2(y0 + 38.5)} ${r2(n - 3)} ${r2(y0 + 41)} ${r2(n)} ${r2(y0 + 40.5)}C${r2(n + 3)} ${r2(y0 + 41)} ${r2(n + 7)} ${r2(y0 + 38.5)} ${r2(n + 6.8)} ${r2(y0 + 33)}C${r2(n + 6.4)} ${r2(y0 + 26)} ${r2(n + 3.6)} ${r2(y0 + 14)} ${r2(n + 3)} ${r2(y0)}Z`;
	const nostrils = `M${r2(n - 4.6)} ${r2(y0 + 36.5)}q1.6-1.6 3 .2q-1.4 1.2-3-.2Z M${r2(n + 4.6)} ${r2(y0 + 36.5)}q-1.6-1.6-3 .2q1.4 1.2 3-.2Z`;
	const brows = `M${r2(lx - 13)} ${r2(ly - 12)}L${r2(n - 4)} ${r2(ly - 6.5)}L${r2(n - 4.5)} ${r2(ly - 3.6)}L${r2(lx - 12)} ${r2(ly - 9)}Z M${r2(rx + 13)} ${r2(ly - 12)}L${r2(n + 4)} ${r2(ly - 6.5)}L${r2(n + 4.5)} ${r2(ly - 3.6)}L${r2(rx + 12)} ${r2(ly - 9)}Z`;
	G.rancour = {
		layers: [
			{ role: "body", mat: "leather", d: F.d([0]), holes: F.d([1, 2]) },
			{ role: "engrave", d: brows },
			{ role: "relief", mat: "ash", d: T.d([2]) },
			{ role: "relief", mat: "leather", d: nose },
			{ role: "engrave", d: nostrils },
		],
		eyes: eyesOf(F, 1, 2),
		eyeR: eyeR(F, [1, 2]),
	};
}

// ---- 4 Appetite: Arlecchino. Lorc "domino mask" lacquered black, inlaid with the
// harlequin lozenges (a pattern, generated here).
{
	const S = load("lorc_domino-mask");
	const F = fitter(S, [0], [3, 16, 97, 70]);
	const [x0, y0, x1, y1] = F.box(0);
	const w = 13,
		h = 17;
	const rows = { crimson: [], verdigris: [], amber: [] };
	const mats = ["crimson", "verdigris", "amber"];
	for (let j = -1; (j - 1) * (h / 2) + y0 < y1 + h; j++) {
		for (let i = -1; i * w + x0 < x1 + w; i++) {
			const cx = x0 + i * w + (j % 2 ? w / 2 : 0),
				cy = y0 + j * (h / 2);
			const m = mats[(i + j * 2 + 30) % 3];
			rows[m].push(
				`M${r2(cx)} ${r2(cy - h / 2)}L${r2(cx + w / 2)} ${r2(cy)}L${r2(cx)} ${r2(cy + h / 2)}L${r2(cx - w / 2)} ${r2(cy)}Z`,
			);
		}
	}
	G.appetite = {
		layers: [
			{ role: "body", mat: "lacquer", d: F.d([0]), holes: F.d([1, 2]) },
			...mats.map((m) => ({
				role: "inlay",
				mat: m,
				d: rows[m].join(""),
				clip: 0,
			})),
		],
		eyes: eyesOf(F, 1, 2),
		eyeR: eyeR(F, [1, 2]),
	};
}

// ---- 5 Inquisitor: Medico della Peste. Lorc "bird mask": beak, brass-rimmed lenses,
// nostril slits.
{
	const S = load("lorc_bird-mask");
	const F = fitter(S, [0], [16, 1, 84, 83]);
	const [ax, ay] = F.c(1),
		[bx, by] = F.c(2);
	const ra = (F.box(1)[2] - F.box(1)[0]) / 2;
	const hole = (x, y) => circlePath(x, y, ra * 0.62);
	G.inquisitor = {
		layers: [
			{
				role: "body",
				mat: "ivory",
				d: F.d([0]),
				holes: hole(ax, ay) + hole(bx, by),
			},
			{
				role: "relief",
				mat: "brass",
				d: F.d([1, 2]),
				holes: hole(ax, ay) + hole(bx, by),
			},
			{ role: "engrave", d: F.d([5, 6]) },
		],
		eyes: [
			[r2(ax), r2(ay)],
			[r2(bx), r2(by)],
		],
		eyeR: [r2(ra * 0.62), r2(ra * 0.62)],
	};
}

// ---- 6 Madness: Jolly. Lorc "duality mask" (the split face and its grin) under
// Delapouite's "jester hat" with its bells.
{
	const S = load("lorc_duality-mask");
	const F = fitter(S, [0], [28, 32, 74, 83]);
	const H = load("delapouite_jester-hat");
	const T = fitter(H, [0, 1, 2, 3, 4, 5, 6, 7], [18, 0, 86, 46], "top");
	G.madness = {
		layers: [
			{ role: "body", mat: "bone", d: F.d([0]), holes: F.d([2, 3]) },
			{ role: "inlay", mat: "violet", d: F.d([1]), clip: 0 },
			{ role: "engrave", d: F.d([4]) },
			{ role: "body", mat: "crimson", d: T.d([1]) },
			{ role: "body", mat: "violet", d: T.d([0, 2]) },
			{ role: "relief", mat: "gold", d: T.d([7]) },
			{ role: "relief", mat: "gold", d: T.d([3, 4, 5, 6]) },
		],
		eyes: eyesOf(F, 2, 3),
		eyeR: eyeR(F, [2, 3]),
	};
}

// Bounds of each whole mask (for square, tightly framed chips).
for (const g of Object.values(G)) {
	const b = bbox(
		parse(
			g.layers
				.filter((l) => l.role !== "inlay")
				.map((l) => l.d)
				.join(""),
		),
	);
	g.box = b.map(r2);
}

const src = `// GENERATED by src/ui/masks/tools/build-geometry.mjs from public/masks/src/ (do not edit by hand).
// Mask space is 100 x 84. Source art: game-icons.net, CC BY 3.0 (Lorc, Delapouite); see public/ATTRIBUTION.md.
export const GEOMETRY = ${JSON.stringify(G, null, "\t")};
`;
fs.writeFileSync(OUT, src);
console.log("wrote", path.relative(web, OUT));
for (const [k, v] of Object.entries(G)) console.log(k, JSON.stringify(v.eyes));
