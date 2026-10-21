/**
 * The heroes' backdrop: a wide nave in the title screen's hand (src/screens/title/ink.ts),
 * drawn for an exact box in CSS px: coursed wall, deep vault with ribs, clustered piers,
 * embrasures for the glass (round-headed arches and round roses), a string course,
 * the skirting and a flagstone floor running toward you. Seeded, so it draws the same
 * every time; rasterised once by the browser as an <img>.
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

/** An arched window's glass aperture (300:420), in box px. */
export type ArchHole = { kind: "arch"; cx: number; top: number; w: number };
/** A rose window's glass, in box px. */
export type RoseHole = { kind: "rose"; cx: number; cy: number; r: number };
export type Hole = ArchHole | RoseHole;

export type NaveSpec = {
	w: number;
	h: number;
	/** The floor's far edge, px from the top. */
	floor: number;
	holes?: readonly Hole[];
	/** Pier centre lines, px from the left. */
	piers?: readonly number[];
	/** Where the light comes from (the vignette's centre), px. */
	focus?: readonly [number, number];
	/** The glass tint washed onto the stone around each hole. */
	tint?: string;
	seed?: number;
};

export const archH = (w: number) => (w * 420) / 300;

export function heroNaveSVG(o: NaveSpec): string {
	const { w, h, floor } = o;
	const k = inkKit(o.seed ?? 2207);
	const { poly, line, jq, brush } = k;
	const tint = o.tint ?? "#f0a95a";
	const holes = o.holes ?? [];
	const piers = o.piers ?? [];
	const [fx, fy] = o.focus ?? [w / 2, floor * 0.6];
	// Stone courses grow a little on big screens so the wall never turns to gravel.
	const courseH = Math.round(Math.max(24, Math.min(34, h / 30)));

	// ---------------------------------------------------------------- wall
	const [wallFill, wallInk] = k.wall(-40, w + 40, -20, floor, courseH);

	// glass light on the stone
	let halo = "";
	for (const o2 of holes) {
		if (o2.kind === "arch") {
			const r = o2.w / 2;
			const spring = o2.top + r;
			const bot = o2.top + archH(o2.w);
			halo += `<path d="${archPath(o2.cx, r * 1.7, spring, bot + r * 0.5)}" fill="${tint}" opacity=".05"/>`;
			halo += `<path d="${archPath(o2.cx, r * 1.4, spring, bot + r * 0.3)}" fill="${tint}" opacity=".06"/>`;
		} else {
			halo += `<circle cx="${f1(o2.cx)}" cy="${f1(o2.cy)}" r="${f1(o2.r * 1.5)}" fill="${tint}" opacity=".05"/>`;
			halo += `<circle cx="${f1(o2.cx)}" cy="${f1(o2.cy)}" r="${f1(o2.r * 1.25)}" fill="${tint}" opacity=".06"/>`;
		}
	}

	// ---------------------------------------------------------------- vault
	const vTop = Math.max(60, h * 0.16);
	const vault =
		`<rect x="-40" y="-40" width="${w + 80}" height="${f1(vTop + 40)}" fill="url(#vaultG)"/>` +
		`<rect x="-40" y="-40" width="${w + 80}" height="${f1(vTop * 0.8 + 40)}" fill="url(#xhatch)" opacity=".22"/>`;
	let ribs = "";
	const ribFrom = piers.length ? piers : [w * 0.08, w * 0.92];
	for (let i = 0; i < ribFrom.length - 1; i++) {
		const a = ribFrom[i] as number;
		const b = ribFrom[i + 1] as number;
		const mid = (a + b) / 2;
		const d = `M${f1(a)} ${f1(vTop * 0.55)} Q${f1(mid)} ${f1(-vTop * 0.9)} ${f1(b)} ${f1(vTop * 0.55)}`;
		ribs += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="14"/>`;
		ribs += `<path d="${d}" fill="none" stroke="#4a3626" stroke-width="9"/>`;
		ribs += `<path d="${d}" fill="none" stroke="${BONE_D}" stroke-width="1.5" opacity=".35" transform="translate(0 -2)"/>`;
	}

	// ---------------------------------------------------------------- piers
	const pier = (cx: number) => {
		const lit: -1 | 1 = cx < fx ? 1 : -1;
		const pw = Math.max(40, Math.min(64, w * 0.034));
		const top = -30;
		const cap = vTop * 0.45;
		const base = floor - 30;
		let s = poly(
			[
				[cx - pw / 2, top],
				[cx + pw / 2, top],
				[cx + pw / 2, base],
				[cx - pw / 2, base],
			],
			"#241912",
		);
		const unit = pw / 46;
		for (const [dx, ww, fill] of [
			[-pw / 2 + 3 * unit, 9 * unit, lit < 0 ? "#4a3626" : "#1a120d"],
			[-6 * unit, 12 * unit, "#33241a"],
			[pw / 2 - 12 * unit, 9 * unit, lit > 0 ? "#4a3626" : "#1a120d"],
		] as const) {
			const q: Pt[] = [
				[cx + dx, top],
				[cx + dx + ww, top],
				[cx + dx + ww, base],
				[cx + dx, base],
			];
			s += poly(q, fill) + line(q, 3);
		}
		s += poly(
			[
				[cx + (lit > 0 ? -pw / 2 : 0), top],
				[cx + (lit > 0 ? 0 : pw / 2), top],
				[cx + (lit > 0 ? 0 : pw / 2), base],
				[cx + (lit > 0 ? -pw / 2 : 0), base],
			],
			"url(#hatch)",
			'opacity=".55"',
		);
		const capQ = jq(
			[
				[cx - pw / 2 - 8, cap],
				[cx + pw / 2 + 8, cap],
				[cx + pw / 2 + 2, cap + 18],
				[cx - pw / 2 - 2, cap + 18],
			],
			0.7,
		);
		s += poly(capQ, "#5a4430") + line(capQ, 4);
		s += brush(
			[
				[cx - pw / 2 - 4, cap + 3],
				[cx, cap + 2.4],
				[cx + pw / 2 + 4, cap + 3],
			],
			2,
			BONE_D,
			'opacity=".5"',
		);
		const baseQ = jq(
			[
				[cx - pw / 2 - 2, base],
				[cx + pw / 2 + 2, base],
				[cx + pw / 2 + 10, floor + 4],
				[cx - pw / 2 - 10, floor + 4],
			],
			0.7,
		);
		s += poly(baseQ, "#3d2c1f") + line(baseQ, 4);
		return s;
	};

	// ---------------------------------------------------------------- embrasures
	let emb = "";
	let studs = "";
	const stud = ([x, y]: Pt, r: number) =>
		`<g transform="translate(${f1(x)} ${f1(y)})"><circle r="${f1(r * 1.25)}" fill="#0d0907"/><circle r="${f1(r)}" fill="#b8924a"/><circle r="${f1(r)}" fill="url(#studG)"/><circle r="${f1(r)}" class="k" stroke-width="1.3"/><circle cx="${f1(-r * 0.35)}" cy="${f1(-r * 0.37)}" r="${f1(r * 0.25)}" fill="${BONE}" opacity=".85"/></g>`;
	for (const o2 of holes) {
		if (o2.kind === "arch") {
			const R0 = o2.w / 2;
			const u = o2.w / 200;
			const SPRING = o2.top + R0;
			const BOT = o2.top + archH(o2.w);
			// the window's own stone surround overhangs by ~9%: the embrasure sits outside it
			const out = 34 * u;
			emb += `<path d="${archPath(o2.cx, R0 + out + 8 * u, SPRING, BOT + 4)}" fill="#3a2a1d"/>`;
			emb += `<path d="${archPath(o2.cx, R0 + out + 8 * u, SPRING, BOT + 4)}" class="k k4"/>`;
			emb += `<path d="${archPath(o2.cx, R0 + out, SPRING, BOT + 4)}" fill="#20160f"/>`;
			{
				const rv = archPts(o2.cx, R0 + out, SPRING, BOT + 2, 22);
				const ig = archPts(o2.cx, R0 + out * 0.5, SPRING, BOT, 22);
				const half = (side: -1 | 1) =>
					rv
						.filter(([x]) => (side < 0 ? x <= o2.cx : x >= o2.cx))
						.concat(
							ig
								.filter(([x]) => (side < 0 ? x <= o2.cx : x >= o2.cx))
								.reverse(),
						);
				const shadow: -1 | 1 = o2.cx < fx ? -1 : 1;
				emb += poly(half(shadow), INK);
				emb += poly(half(shadow), "url(#xhatch)", 'opacity=".8"');
			}
			const xl = o2.cx - R0;
			const xr = o2.cx + R0;
			const hr = out + 12 * u;
			const hood = (wd: number, c: string, extra = "") =>
				`<path d="M${f1(xl - hr)} ${f1(SPRING)} A${f1(R0 + hr)} ${f1(R0 + hr)} 0 0 1 ${f1(xr + hr)} ${f1(SPRING)}" fill="none" stroke="${c}" stroke-width="${f1(wd)}" ${extra}/>`;
			emb += hood(12 * u, INK) + hood(5 * u, "#6b5139");
			emb += hood(1.4, BONE_D, 'opacity=".45" transform="translate(0 -2)"');
			for (const p of alongArch(o2.cx, R0 + out + 2 * u, SPRING, BOT, 25))
				studs += stud(p, 4.3 * u);
		} else {
			const u = o2.r / 100;
			const c = `cx="${f1(o2.cx)}" cy="${f1(o2.cy)}"`;
			emb += `<circle ${c} r="${f1(o2.r * 1.2)}" fill="#3a2a1d"/>`;
			emb += `<circle ${c} r="${f1(o2.r * 1.2)}" class="k k4"/>`;
			emb += `<circle ${c} r="${f1(o2.r * 1.12)}" fill="#20160f"/>`;
			emb += `<path d="M${f1(o2.cx - o2.r * 1.12)} ${f1(o2.cy)} A${f1(o2.r * 1.12)} ${f1(o2.r * 1.12)} 0 0 1 ${f1(o2.cx + o2.r * 1.12)} ${f1(o2.cy)} Z" fill="${INK}" opacity=".55"/>`;
			emb += `<circle ${c} r="${f1(o2.r * 1.26)}" fill="none" stroke="${INK}" stroke-width="${f1(12 * u)}"/>`;
			emb += `<circle ${c} r="${f1(o2.r * 1.26)}" fill="none" stroke="#6b5139" stroke-width="${f1(5 * u)}"/>`;
			for (let i = 0; i < 24; i++) {
				const t = (i / 24) * Math.PI * 2;
				studs += stud(
					[
						o2.cx + Math.cos(t) * o2.r * 1.16,
						o2.cy + Math.sin(t) * o2.r * 1.16,
					],
					4.3 * u,
				);
			}
		}
	}

	// ---------------------------------------------------------------- string course + skirting
	const arches = holes.filter((x): x is ArchHole => x.kind === "arch");
	let course = "";
	if (arches.length) {
		const sc = Math.max(...arches.map((a) => a.top + archH(a.w))) + 30;
		if (sc < floor - 30) {
			course += poly(
				jq(
					[
						[-40, sc],
						[w + 40, sc],
						[w + 40, sc + 12],
						[-40, sc + 12],
					],
					0.8,
				),
				"#4a3626",
			);
			course += brush(
				[
					[-30, sc + 2.5],
					[w / 2, sc + 2],
					[w + 30, sc + 2.6],
				],
				2.2,
				BONE_D,
				'opacity=".45"',
			);
			course += poly(
				[
					[-40, sc + 12],
					[w + 40, sc + 12],
					[w + 40, sc + 20],
					[-40, sc + 20],
				],
				INK,
			);
		}
	}
	const skirting =
		poly(
			[
				[-40, floor - 12],
				[w + 40, floor - 12],
				[w + 40, floor + 2],
				[-40, floor + 2],
			],
			"#1a120d",
		) +
		brush(
			[
				[-30, floor - 10],
				[w / 2, floor - 10.5],
				[w + 30, floor - 10],
			],
			1.6,
			BONE_D,
			'opacity=".3"',
		);

	// ---------------------------------------------------------------- floor
	const fh = Math.max(120, h - floor);
	const rows = [4, 3.25, 2.7, 2.25, 1.9, 1.6, 1.36, 1.17, 1.0, 0.86, 0.74];
	while (rows.length < 40) {
		const z = rows[rows.length - 1] ?? 0.74;
		const y = floor + fh * ((1 / z - 0.25) / 0.75);
		if (y > h + 40) break;
		rows.push(z * 0.86);
	}
	const span = Math.max(1400, w * 2.5);
	const [floorFill, floorInk] = k.floor(fx, floor, fh, 4, rows, [
		fx - span,
		fx + span,
	]);
	const floorShade =
		`<rect x="-40" y="${f1(floor)}" width="${w + 80}" height="60" fill="url(#farShade)"/>` +
		`<rect x="-40" y="${f1(floor)}" width="${w + 80}" height="40" fill="url(#hatch)" opacity=".35"/>`;

	const vr = Math.hypot(Math.max(fx, w - fx), Math.max(fy, h - fy));
	const defs = `${k.defs()}
<radialGradient id="studG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f5dfa0" stop-opacity=".9"/><stop offset=".5" stop-color="#c9a24f" stop-opacity=".4"/><stop offset="1" stop-color="#3a2a1d" stop-opacity=".9"/></radialGradient>
<linearGradient id="farShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".85"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
<linearGradient id="vaultG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".95"/><stop offset=".6" stop-color="${INK}" stop-opacity=".6"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" gradientUnits="userSpaceOnUse" cx="${f1(fx)}" cy="${f1(fy)}" r="${f1(vr)}"><stop offset=".3" stop-color="#050403" stop-opacity="0"/><stop offset=".72" stop-color="#050403" stop-opacity=".66"/><stop offset="1" stop-color="#050403" stop-opacity=".96"/></radialGradient>`;

	const inner = `<rect x="-40" y="-40" width="${w + 80}" height="${h + 80}" fill="#120c0a"/>
<g filter="url(#wob)">${wallFill}${wallInk}</g>
<g class="scr">${halo}</g>
${vault}
<g filter="url(#wob)">${emb}${studs}${course}</g>
<g filter="url(#wob)">${piers.map(pier).join("")}${ribs}</g>
${skirting}${floorFill}<g filter="url(#wob)">${floorInk}</g>${floorShade}
<rect x="-40" y="-40" width="${w + 80}" height="${h + 80}" fill="url(#vig)"/>`;
	return svgDoc([0, 0, Math.round(w), Math.round(h)], defs, inner);
}
