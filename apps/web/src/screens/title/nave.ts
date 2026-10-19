/**
 * The title nave: one tall lit window in a coursed wall, clustered piers and
 * vault ribs, a flagstone floor running toward you. Drawn in a fixed 390 x 844
 * stage (the composition), with the stone continued as far past the stage as the
 * screen needs (`bleed`), so no width or height ever shows bars.
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
} from "./ink";

export const STAGE_W = 390;
export const STAGE_H = 844;

/** The window aperture, in stage units (300:420 glass). */
export const WIN = {
	cx: 195,
	w: 200,
	top: 92,
	theme: "vesper",
	seed: 7,
} as const;
export const WIN_H = (WIN.w * 420) / 300;
export const WIN_BOT = WIN.top + WIN_H;
const R0 = WIN.w / 2;
const SPRING = WIN.top + R0;
const TINT = "#f0a95a";

/** The floor's far edge. */
export const FLOOR_Y = 492;

export type Bleed = { x: number; y: number };

/** Stage-space box the drawing covers for a given bleed. */
export function naveBox(b: Bleed) {
	return [-b.x, -b.y, STAGE_W + 2 * b.x, STAGE_H + 2 * b.y] as const;
}

export function naveSVG(b: Bleed): string {
	const k = inkKit(1471);
	const { poly, line, jq, brush } = k;
	const vb = naveBox(b);
	const [x0, y0, vw, vh] = vb;
	const x1 = x0 + vw;
	const y1 = y0 + vh;

	// ---------------------------------------------------------------- wall
	const [wallFill, wallInk] = k.wall(
		x0 - 40,
		x1 + 40,
		Math.min(-20, y0 - 10),
		FLOOR_Y,
	);

	// window halo on the stone
	const halo =
		`<path d="${archPath(WIN.cx, R0 + 70, SPRING, WIN_BOT + 46)}" fill="${TINT}" opacity=".05"/>` +
		`<path d="${archPath(WIN.cx, R0 + 46, SPRING, WIN_BOT + 30)}" fill="${TINT}" opacity=".06"/>`;

	// ---------------------------------------------------------------- piers + vault
	const pier = (cx: number, lit: -1 | 1) => {
		const w = 46;
		const top = y0 - 10;
		const cap = 18;
		const base = FLOOR_Y - 34;
		let s = "";
		s += poly(
			[
				[cx - w / 2, top],
				[cx + w / 2, top],
				[cx + w / 2, base],
				[cx - w / 2, base],
			],
			"#241912",
		);
		// rounded shafts: lit strip, core, shadow strip
		for (const [dx, ww, fill] of [
			[-w / 2 + 3, 9, lit < 0 ? "#4a3626" : "#1a120d"],
			[-6, 12, "#33241a"],
			[w / 2 - 12, 9, lit > 0 ? "#4a3626" : "#1a120d"],
		] as const) {
			s += poly(
				[
					[cx + dx, top],
					[cx + dx + ww, top],
					[cx + dx + ww, base],
					[cx + dx, base],
				],
				fill,
			);
			s += line(
				[
					[cx + dx, top],
					[cx + dx + ww, top],
					[cx + dx + ww, base],
					[cx + dx, base],
				],
				3,
			);
		}
		// shadow hatch on the side away from the window
		s += poly(
			[
				[cx + (lit > 0 ? -w / 2 : 0), top],
				[cx + (lit > 0 ? 0 : w / 2), top],
				[cx + (lit > 0 ? 0 : w / 2), base],
				[cx + (lit > 0 ? -w / 2 : 0), base],
			],
			"url(#hatch)",
			'opacity=".55"',
		);
		// capital and base
		const capQ = jq(
			[
				[cx - w / 2 - 8, cap],
				[cx + w / 2 + 8, cap],
				[cx + w / 2 + 2, cap + 18],
				[cx - w / 2 - 2, cap + 18],
			],
			0.7,
		);
		s += poly(capQ, "#5a4430") + line(capQ, 4);
		s += brush(
			[
				[cx - w / 2 - 4, cap + 3],
				[cx, cap + 2.4],
				[cx + w / 2 + 4, cap + 3],
			],
			2,
			BONE_D,
			'opacity=".5"',
		);
		const baseQ = jq(
			[
				[cx - w / 2 - 2, base],
				[cx + w / 2 + 2, base],
				[cx + w / 2 + 10, FLOOR_Y + 4],
				[cx - w / 2 - 10, FLOOR_Y + 4],
			],
			0.7,
		);
		s += poly(baseQ, "#3d2c1f") + line(baseQ, 4);
		return s;
	};
	const PL = 6;
	const PR = STAGE_W - 6;
	const APEX = -150;
	const rib = (side: -1 | 1, off: number) => {
		const px = side < 0 ? PL : PR;
		return `M${px} ${18 + off} Q${f1(px - side * 14)} ${f1(-110 + off)} ${WIN.cx} ${APEX + off}`;
	};
	// deep vault beyond the ribs
	const vaultDark = `<path d="M${x0} ${y0} H${x1} V${18} H${PR} Q${PR - 14} -110 ${WIN.cx} ${APEX} Q${PL + 14} -110 ${PL} 18 H${x0} Z" fill="${INK}" opacity=".62"/>`;
	const vaultHatch = `<path d="M${x0} ${y0} H${x1} V${18} H${PR} Q${PR - 14} -110 ${WIN.cx} ${APEX} Q${PL + 14} -110 ${PL} 18 H${x0} Z" fill="url(#xhatch)" opacity=".5"/>`;
	let ribs = "";
	for (const side of [-1, 1] as const) {
		ribs += `<path d="${rib(side, 0)}" fill="none" stroke="${INK}" stroke-width="15"/>`;
		ribs += `<path d="${rib(side, 0)}" fill="none" stroke="#4a3626" stroke-width="10"/>`;
		ribs += `<path d="${rib(side, -2)}" fill="none" stroke="${BONE_D}" stroke-width="1.6" opacity=".4"/>`;
	}
	// outer wall beyond the piers falls into shadow
	const flank = (side: -1 | 1) => {
		const inner = side < 0 ? PL - 23 : PR + 23;
		const outer = side < 0 ? x0 - 10 : x1 + 10;
		return (
			poly(
				[
					[inner, y0 - 10],
					[outer, y0 - 10],
					[outer, FLOOR_Y],
					[inner, FLOOR_Y],
				],
				INK,
				'opacity=".45"',
			) +
			poly(
				[
					[inner, y0 - 10],
					[outer, y0 - 10],
					[outer, FLOOR_Y],
					[inner, FLOOR_Y],
				],
				"url(#hatch)",
				'opacity=".5"',
			)
		);
	};

	// ---------------------------------------------------------------- embrasure
	const xl = WIN.cx - R0;
	const xr = WIN.cx + R0;
	let emb = "";
	emb += `<path d="${archPath(WIN.cx, R0 + 30, SPRING, WIN_BOT + 4)}" fill="#3a2a1d"/>`;
	emb += `<path d="${archPath(WIN.cx, R0 + 30, SPRING, WIN_BOT + 4)}" class="k k4"/>`;
	emb += `<path d="${archPath(WIN.cx, R0 + 24, SPRING, WIN_BOT + 4)}" fill="#20160f"/>`;
	emb += `<path d="${archPath(WIN.cx, R0 + 14, SPRING, WIN_BOT + 2)}" fill="#120c09"/>`;
	{
		const rv = archPts(WIN.cx, R0 + 14, SPRING, WIN_BOT + 2, 22);
		const ig = archPts(WIN.cx, R0, SPRING, WIN_BOT, 22);
		const half = (side: -1 | 1) => {
			const a = rv.filter(([x]) => (side < 0 ? x <= WIN.cx : x >= WIN.cx));
			const c = ig
				.filter(([x]) => (side < 0 ? x <= WIN.cx : x >= WIN.cx))
				.reverse();
			return a.concat(c);
		};
		emb += poly(half(-1), INK);
		emb += poly(half(1), "#3d2a1c");
		emb += poly(half(-1), "url(#xhatch)", 'opacity=".8"');
	}
	emb += `<path d="${archPath(WIN.cx, R0 + 5, SPRING, WIN_BOT)}" fill="none" stroke="${TINT}" stroke-width="7" opacity=".42"/>`;
	// the aperture itself (the glass sits over this)
	emb += `<path d="${archPath(WIN.cx, R0, SPRING, WIN_BOT)}" fill="#0d0907"/>`;
	// hood moulding
	const hood = (rr: number, w: number, c: string, extra = "") =>
		`<path d="M${xl - rr} ${SPRING} A${R0 + rr} ${R0 + rr} 0 0 1 ${xr + rr} ${SPRING}" fill="none" stroke="${c}" stroke-width="${w}" ${extra}/>`;
	emb += hood(30, 12, INK) + hood(30, 5, "#6b5139");
	emb += hood(31, 1.4, BONE_D, 'opacity=".45" transform="translate(0 -2)"');
	for (const sx of [xl - 30, xr + 30]) {
		const q: Pt[] = [
			[sx - 8, SPRING],
			[sx + 8, SPRING],
			[sx + 6, SPRING + 16],
			[sx - 6, SPRING + 16],
		];
		emb += poly(jq(q, 0.6), "#4a3626") + line(q, 3);
	}
	// gilt studs around the arch
	const studs = alongArch(WIN.cx, R0 + 22, SPRING, WIN_BOT, 27)
		.map(
			([x, y]) =>
				`<g transform="translate(${f1(x)} ${f1(y)})"><circle r="5.4" fill="#0d0907"/><circle r="4.3" fill="#b8924a"/><circle r="4.3" fill="url(#studG)"/><circle r="4.3" class="k" stroke-width="1.3"/><circle cx="-1.5" cy="-1.6" r="1.05" fill="${BONE}" opacity=".85"/></g>`,
		)
		.join("");
	// sill
	{
		const sill: Pt[] = [
			[xl - 6, WIN_BOT],
			[xr + 6, WIN_BOT],
			[xr + 22, WIN_BOT + 22],
			[xl - 22, WIN_BOT + 22],
		];
		emb += poly(jq(sill, 0.8), "#5a4430");
		emb += poly(sill, TINT, 'opacity=".22"');
		emb += line(sill, 3);
		emb += poly(
			jq(
				[
					[xl - 22, WIN_BOT + 22],
					[xr + 22, WIN_BOT + 22],
					[xr + 18, WIN_BOT + 31],
					[xl - 18, WIN_BOT + 31],
				],
				1,
			),
			INK,
		);
	}
	// string course running the width of the nave under the sill
	const SC = WIN_BOT + 31;
	let course = "";
	course += poly(
		jq(
			[
				[x0 - 10, SC],
				[x1 + 10, SC],
				[x1 + 10, SC + 12],
				[x0 - 10, SC + 12],
			],
			0.8,
		),
		"#4a3626",
	);
	course += brush(
		[
			[x0, SC + 2.5],
			[WIN.cx, SC + 2],
			[x1, SC + 2.6],
		],
		2.2,
		BONE_D,
		'opacity=".45"',
	);
	course += poly(
		[
			[x0 - 10, SC + 12],
			[x1 + 10, SC + 12],
			[x1 + 10, SC + 20],
			[x0 - 10, SC + 20],
		],
		INK,
	);
	course += poly(
		[
			[x0 - 10, SC + 20],
			[x1 + 10, SC + 20],
			[x1 + 10, SC + 46],
			[x0 - 10, SC + 46],
		],
		"url(#hatch)",
		'opacity=".6"',
	);

	// skirting where wall meets floor
	const skirting =
		poly(
			[
				[x0 - 10, FLOOR_Y - 12],
				[x1 + 10, FLOOR_Y - 12],
				[x1 + 10, FLOOR_Y + 2],
				[x0 - 10, FLOOR_Y + 2],
			],
			"#1a120d",
		) +
		brush(
			[
				[x0, FLOOR_Y - 10],
				[WIN.cx, FLOOR_Y - 10.5],
				[x1, FLOOR_Y - 10],
			],
			1.6,
			BONE_D,
			'opacity=".3"',
		);

	// ---------------------------------------------------------------- floor
	const rows = [
		4, 3.25, 2.7, 2.25, 1.9, 1.6, 1.36, 1.17, 1.0, 0.86, 0.74, 0.64,
	];
	while (rows.length < 40) {
		const z = rows[rows.length - 1] ?? 0.64;
		const fy = FLOOR_Y + (STAGE_H - FLOOR_Y) * ((1 / z - 0.25) / 0.75);
		if (fy > y1 + 20) break;
		rows.push(z * 0.86);
	}
	const span = Math.max(1400, vw * 3);
	const [floorFill, floorInk] = k.floor(
		WIN.cx,
		FLOOR_Y,
		STAGE_H - FLOOR_Y,
		4,
		rows,
		[WIN.cx - span, WIN.cx + span],
	);
	// far floor sinks into shadow; corners too
	const floorShade =
		`<rect x="${x0}" y="${FLOOR_Y}" width="${vw}" height="60" fill="url(#farShade)"/>` +
		`<rect x="${x0}" y="${FLOOR_Y}" width="${vw}" height="40" fill="url(#hatch)" opacity=".35"/>`;

	const defs = `${k.defs()}
<radialGradient id="studG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f5dfa0" stop-opacity=".9"/><stop offset=".5" stop-color="#c9a24f" stop-opacity=".4"/><stop offset="1" stop-color="#3a2a1d" stop-opacity=".9"/></radialGradient>
<linearGradient id="farShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".85"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" gradientUnits="userSpaceOnUse" cx="${WIN.cx}" cy="${SPRING + 60}" r="560"><stop offset=".35" stop-color="#050403" stop-opacity="0"/><stop offset=".78" stop-color="#050403" stop-opacity=".72"/><stop offset="1" stop-color="#050403" stop-opacity=".96"/></radialGradient>`;

	const inner = `<rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="#120c0a"/>
<g filter="url(#wob)">${wallFill}${wallInk}</g>
<g class="scr">${halo}</g>
${vaultDark}<g opacity=".24">${vaultHatch}</g>
${flank(-1)}${flank(1)}
<g filter="url(#wob)">${emb}${studs}${course}</g>
<g filter="url(#wob)">${pier(PL, 1)}${pier(PR, -1)}${ribs}</g>
${skirting}${floorFill}<g filter="url(#wob)">${floorInk}</g>${floorShade}
<rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="url(#vig)"/>`;
	return svgDoc(vb, defs, inner);
}
