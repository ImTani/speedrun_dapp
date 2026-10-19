/**
 * A sealed door in the ink hand: a round-headed doorway in coursed stone, a
 * planked oak leaf on iron straps, a barred grille, two chains crossed over it
 * and a blood-wax seal pressed where they meet (the way's own carving in the wax).
 * The grille is left open (masked out) so whatever waits behind it can show.
 */
import {
	alongArch,
	archPath,
	archPts,
	BONE,
	BONE_D,
	f1,
	INK,
	inkKit,
	type Pt,
	svgDoc,
} from "@/screens/title/ink";
import { ICONS, type IconKey } from "@/ui/tabIcons";

export const DOOR_W = 300;
export const DOOR_H = 440;
export const CX = 150;
const SPRING = 150;
const BOT = 404;
const LEAF_R = 92;
const FRAME_R = 124;

/** The grille opening, shared with the layers behind and above the door. */
export const GRILLE = { cx: CX, r: 21, spring: 190, bottom: 214 } as const;
export const grillePath = archPath(
	GRILLE.cx,
	GRILLE.r,
	GRILLE.spring,
	GRILLE.bottom,
);
/** Where the light leaks under the door. */
export const SILL = {
	x0: CX - LEAF_R + 4,
	x1: CX + LEAF_R - 4,
	y: BOT,
} as const;
/** Where the chains cross and the seal is pressed. */
export const SEAL = { cx: CX, cy: 300, r: 30 } as const;

export function doorSVG(which: IconKey, seed = 71): string {
	const k = inkKit(seed);
	const { R, poly, line, jq, brush } = k;

	// ------------------------------------------------ stone around the door
	let frame = "";
	frame += `<path d="${archPath(CX, FRAME_R + 6, SPRING, BOT)}" fill="${INK}" opacity=".55"/>`;
	frame += `<path d="${archPath(CX, FRAME_R, SPRING, BOT)}" fill="#3a2a1d"/>`;
	// voussoirs round the head, jamb stones down the sides
	for (let i = 0; i <= 12; i++) {
		const a = Math.PI + (i / 12) * Math.PI;
		const c = Math.cos(a);
		const s = Math.sin(a);
		frame += brush(
			[
				[CX + c * (LEAF_R + 6), SPRING + s * (LEAF_R + 6)],
				[CX + c * (FRAME_R - 2), SPRING + s * (FRAME_R - 2)],
			],
			2.4,
		);
	}
	for (let y = SPRING + 30; y < BOT - 8; y += 34) {
		for (const side of [-1, 1]) {
			const xa = CX + side * (LEAF_R + 6);
			const xb = CX + side * (FRAME_R - 2);
			frame += brush(
				[
					[xa, y + (R() - 0.5) * 2],
					[xb, y + (R() - 0.5) * 2],
				],
				2.2,
			);
		}
	}
	// lit edge (right) and shadow (left) of the reveal
	{
		const outer = archPts(CX, FRAME_R, SPRING, BOT, 24);
		const inner = archPts(CX, LEAF_R + 8, SPRING, BOT, 24);
		const half = (side: -1 | 1) =>
			outer
				.filter(([x]) => (side < 0 ? x <= CX : x >= CX))
				.concat(
					inner.filter(([x]) => (side < 0 ? x <= CX : x >= CX)).reverse(),
				);
		frame += poly(half(-1), "url(#xhatch)", 'opacity=".7"');
		frame += poly(half(1), "#5a4430", 'opacity=".35"');
	}
	frame += `<path d="${archPath(CX, FRAME_R, SPRING, BOT)}" class="k k4"/>`;
	frame += `<path d="${archPath(CX, LEAF_R + 8, SPRING, BOT)}" fill="${INK}"/>`;
	// keystone
	{
		const q: Pt[] = [
			[CX - 13, SPRING - FRAME_R - 6],
			[CX + 13, SPRING - FRAME_R - 6],
			[CX + 9, SPRING - LEAF_R - 4],
			[CX - 9, SPRING - LEAF_R - 4],
		];
		frame += poly(jq(q, 0.6), "#5a4430") + line(q, 4);
	}
	// gilt studs along the head, as on the window arches
	frame += alongArch(CX, FRAME_R - 12, SPRING, BOT - 6, 21)
		.map(
			([x, y]) =>
				`<g transform="translate(${f1(x)} ${f1(y)})"><circle r="4.4" fill="#0d0907"/><circle r="3.4" fill="#8a6a2e"/><circle r="3.4" class="k" stroke-width="1.1"/><circle cx="-1.1" cy="-1.2" r=".8" fill="${BONE}" opacity=".7"/></g>`,
		)
		.join("");

	// ------------------------------------------------ the leaf
	let leaf = "";
	const leafD = archPath(CX, LEAF_R, SPRING, BOT);
	leaf += `<path d="${leafD}" fill="url(#oak)"/>`;
	const PL = 8;
	const pw = (LEAF_R * 2) / PL;
	for (let i = 0; i < PL; i++) {
		const x = CX - LEAF_R + i * pw;
		const tone =
			["#3f2716", "#3a2414", "#452b18", "#36220f"][(R() * 4) | 0] ?? "#3f2716";
		leaf += `<rect x="${f1(x)}" y="0" width="${f1(pw)}" height="${BOT}" fill="${tone}" opacity=".45"/>`;
		// grain
		for (let g = 0; g < 4; g++) {
			const gx = x + 4 + R() * (pw - 8);
			const y0 = 40 + R() * 200;
			leaf += brush(
				[
					[gx, y0],
					[gx + (R() - 0.5) * 3, y0 + 40 + R() * 40],
					[gx + (R() - 0.5) * 3, y0 + 90 + R() * 80],
				],
				1.2,
				BONE_D,
				'opacity=".14"',
			);
		}
		if (i > 0)
			leaf += brush(
				[
					[x, 20],
					[x + (R() - 0.5), 200],
					[x, BOT],
				],
				2.6,
			);
	}
	// shadow falling across the left of the leaf
	leaf += `<rect x="${CX - LEAF_R}" y="0" width="${LEAF_R * 0.9}" height="${BOT}" fill="url(#hatch)" opacity=".55"/>`;
	leaf += `<rect x="${CX - LEAF_R}" y="0" width="${LEAF_R * 2}" height="${BOT}" fill="url(#leafShade)"/>`;

	// iron straps with rivets
	for (const y of [244, 352, 386]) {
		const half = Math.sqrt(
			Math.max(0, LEAF_R ** 2 - Math.max(0, SPRING - y) ** 2),
		);
		const x0 = CX - half;
		const x1 = CX + half;
		const q: Pt[] = [
			[x0, y],
			[x1, y],
			[x1, y + 10],
			[x0, y + 10],
		];
		leaf += poly(q, "#2b2522") + line(q, 3);
		leaf += brush(
			[
				[x0 + 4, y + 2.4],
				[x1 - 4, y + 2.2],
			],
			1.2,
			"#8a8078",
			'opacity=".55"',
		);
		for (let x = x0 + 10; x < x1 - 4; x += 22)
			leaf += `<circle cx="${f1(x)}" cy="${y + 5}" r="2.6" fill="#1a1614"/><circle cx="${f1(x - 0.7)}" cy="${y + 4.2}" r=".9" fill="#b8aea4" opacity=".7"/>`;
	}
	// ring handle
	let fittings = "";
	fittings += `<circle cx="${CX + 56}" cy="318" r="5" fill="#2b2522" class="k k3"/>`;
	fittings += `<circle cx="${CX + 56}" cy="333" r="13" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="${CX + 56}" cy="333" r="13" fill="none" stroke="#5a524c" stroke-width="3"/>`;
	// grille frame
	fittings += `<path d="${archPath(GRILLE.cx, GRILLE.r + 7, GRILLE.spring, GRILLE.bottom + 6)}" fill="#2b2522"/>`;
	fittings += `<path d="${archPath(GRILLE.cx, GRILLE.r + 7, GRILLE.spring, GRILLE.bottom + 6)}" class="k k3"/>`;
	fittings += `<path d="${leafD}" class="k k6"/>`;

	// bars over the open grille (outside the mask)
	let bars = "";
	for (const dx of [-11, 0, 11]) {
		const top =
			GRILLE.spring - Math.sqrt(Math.max(0, GRILLE.r ** 2 - dx * dx)) - 2;
		bars += `<path d="M${CX + dx} ${f1(top)} V${GRILLE.bottom + 1}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
		bars += `<path d="M${CX + dx} ${f1(top + 1)} V${GRILLE.bottom}" stroke="#4a4440" stroke-width="3" stroke-linecap="round"/>`;
		bars += `<path d="M${CX + dx - 0.7} ${f1(top + 2)} V${GRILLE.bottom - 3}" stroke="#a69c92" stroke-width=".8" opacity=".6"/>`;
	}
	bars += `<path d="M${CX - GRILLE.r} ${GRILLE.spring + 8} H${CX + GRILLE.r}" stroke="${INK}" stroke-width="5"/><path d="M${CX - GRILLE.r} ${GRILLE.spring + 8} H${CX + GRILLE.r}" stroke="#4a4440" stroke-width="2.4"/>`;

	// ------------------------------------------------ chains and seal
	const chain = (a: Pt, b: Pt) => {
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
		const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
		const n = Math.floor(len / 13);
		let out = "";
		for (let i = 0; i <= n; i++) {
			const t = i / n;
			const x = a[0] + (b[0] - a[0]) * t;
			const y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 10;
			const face = i % 2 === 0;
			const ry = face ? 5 : 1.9;
			out += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"><ellipse rx="9" ry="${ry}" fill="none" stroke="${INK}" stroke-width="5.2"/><ellipse rx="9" ry="${ry}" fill="none" stroke="#575049" stroke-width="2.6"/>${face ? `<path d="M-6 -3.4 Q0 -5.6 6 -3.4" fill="none" stroke="#c9bfb4" stroke-width=".9" opacity=".7"/>` : ""}</g>`;
		}
		return out;
	};
	const chains =
		chain([CX - LEAF_R - 14, 236], [CX + LEAF_R + 14, 360]) +
		chain([CX + LEAF_R + 14, 236], [CX - LEAF_R - 14, 360]);
	// staples the chains hang from, driven into the jambs
	let staples = "";
	for (const [x, y] of [
		[CX - LEAF_R - 14, 236],
		[CX + LEAF_R + 14, 236],
		[CX - LEAF_R - 14, 360],
		[CX + LEAF_R + 14, 360],
	] as const)
		staples += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="#2b2522" class="k k3"/><circle cx="${x}" cy="${y}" r="2" fill="#a69c92" opacity=".6"/>`;

	// wax: a slumped blob, pressed with the way's carving
	const blob: Pt[] = [];
	for (let i = 0; i < 22; i++) {
		const a = (i / 22) * Math.PI * 2;
		const r = SEAL.r * (0.9 + R() * 0.16) + (Math.sin(a) > 0.6 ? 4 * R() : 0);
		blob.push([SEAL.cx + Math.cos(a) * r, SEAL.cy + Math.sin(a) * r]);
	}
	const icon = ICONS[which].d;
	const sz = SEAL.r * 1.32;
	const iconT = `translate(${f1(SEAL.cx - sz / 2)} ${f1(SEAL.cy - sz / 2)}) scale(${(sz / 512).toFixed(4)})`;
	let seal = "";
	seal += `<ellipse cx="${SEAL.cx + 3}" cy="${SEAL.cy + 6}" rx="${SEAL.r + 2}" ry="${SEAL.r}" fill="${INK}" opacity=".6"/>`;
	seal += poly(blob, "url(#wax)");
	seal += `<polygon points="${blob.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" class="k k4"/>`;
	seal += `<circle cx="${SEAL.cx}" cy="${SEAL.cy}" r="${SEAL.r * 0.74}" fill="#6a0d12" opacity=".55"/>`;
	seal += `<circle cx="${SEAL.cx}" cy="${SEAL.cy}" r="${SEAL.r * 0.74}" fill="none" stroke="#3a0709" stroke-width="2"/>`;
	seal += `<circle cx="${SEAL.cx}" cy="${SEAL.cy}" r="${SEAL.r * 0.74 + 1.5}" fill="none" stroke="#e0565b" stroke-width=".9" opacity=".5"/>`;
	// pressed in: a dark lip above, a lit lip below
	seal += `<path d="${icon}" transform="translate(0 -1.2) ${iconT}" fill="#2a0507"/>`;
	seal += `<path d="${icon}" transform="translate(0 1.2) ${iconT}" fill="#e0565b" opacity=".55"/>`;
	seal += `<path d="${icon}" transform="${iconT}" fill="#7a1016"/>`;
	seal += `<ellipse cx="${SEAL.cx - 10}" cy="${SEAL.cy - 13}" rx="9" ry="4" fill="#ffb0a0" opacity=".25" transform="rotate(-24 ${SEAL.cx - 10} ${SEAL.cy - 13})"/>`;

	// ------------------------------------------------ threshold
	const step: Pt[] = [
		[CX - FRAME_R - 18, BOT],
		[CX + FRAME_R + 18, BOT],
		[CX + FRAME_R + 30, BOT + 22],
		[CX - FRAME_R - 30, BOT + 22],
	];
	const threshold =
		poly(jq(step, 0.8), "#4a3626") +
		line(step, 3) +
		brush(
			[
				[CX - FRAME_R - 14, BOT + 3],
				[CX + FRAME_R + 14, BOT + 3],
			],
			2,
			BONE_D,
			'opacity=".45"',
		) +
		poly(
			[
				[CX - FRAME_R - 30, BOT + 22],
				[CX + FRAME_R + 30, BOT + 22],
				[CX + FRAME_R + 26, BOT + 30],
				[CX - FRAME_R - 26, BOT + 30],
			],
			INK,
		);

	const defs = `${k.defs()}
<linearGradient id="oak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#24150c"/><stop offset=".55" stop-color="#4a2d18"/><stop offset="1" stop-color="#5a3820"/></linearGradient>
<linearGradient id="leafShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".55"/><stop offset=".4" stop-color="${INK}" stop-opacity="0"/><stop offset=".85" stop-color="${INK}" stop-opacity=".1"/><stop offset="1" stop-color="${INK}" stop-opacity=".5"/></linearGradient>
<radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d0353b"/><stop offset=".5" stop-color="#8e1218"/><stop offset="1" stop-color="#3a0709"/></radialGradient>
<clipPath id="leafClip"><path d="${leafD}"/></clipPath>
<mask id="open" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${DOOR_W + 80}" height="${DOOR_H + 80}"><rect x="-40" y="-40" width="${DOOR_W + 80}" height="${DOOR_H + 80}" fill="#fff"/><path d="${grillePath}" fill="#000"/></mask>`;

	const inner = `<g mask="url(#open)">
<g filter="url(#wob)">${frame}</g>
<g clip-path="url(#leafClip)">${leaf}</g>
<g filter="url(#wob)">${fittings}</g>
</g>
${bars}
<g filter="url(#wob)">${staples}${chains}</g>
${seal}
<g filter="url(#wob)">${threshold}</g>`;
	return svgDoc([0, 0, DOOR_W, DOOR_H], defs, inner);
}

/** A plain stretch of the nave wall, for behind the door (object-fit: cover). */
export function wallSVG(seed = 23): string {
	const k = inkKit(seed);
	const W = 520;
	const H = 980;
	const [fill, ink] = k.wall(-20, W + 20, -10, H + 10, 28);
	const defs = `${k.defs()}<radialGradient id="vw" cx=".5" cy=".42" r=".7"><stop offset=".2" stop-color="#050403" stop-opacity=".25"/><stop offset=".75" stop-color="#050403" stop-opacity=".8"/><stop offset="1" stop-color="#050403" stop-opacity=".97"/></radialGradient>`;
	const inner = `<rect width="${W}" height="${H}" fill="#120c0a"/><g filter="url(#wob)">${fill}${ink}</g><rect width="${W}" height="${H}" fill="url(#hatch)" opacity=".18"/><rect width="${W}" height="${H}" fill="url(#vw)"/>`;
	return svgDoc([0, 0, W, H], defs, inner);
}
