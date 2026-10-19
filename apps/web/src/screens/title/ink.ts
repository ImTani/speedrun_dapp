/**
 * A small ink kit for the shell's backdrops (title nave, sealed doors).
 *
 * Same hand as the Gathering stage (src/scene/inkStage.js): jittered stone,
 * tapered brush strokes, a turbulence wobble on every ink line, broken hatching
 * in the shadows. Everything is seeded, so a backdrop draws the same each time.
 * Output is plain SVG markup, rasterised once by the browser as an <img>.
 */

export const INK = "#0b0807";
export const BONE = "#d8c6a0";
export const BONE_D = "#a8916a";

/** Ink line weight multiplier (owner-locked value from the Gathering stage). */
const INK_W = 0.4;

export type Pt = readonly [number, number];

export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const f1 = (n: number) => n.toFixed(1);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const P = (pts: readonly Pt[]) =>
	pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");

export type Ink = ReturnType<typeof inkKit>;

export function inkKit(seed: number) {
	const R = rng(seed);
	const pick = (xs: readonly string[]) => xs[(R() * xs.length) | 0] as string;
	const poly = (pts: readonly Pt[], fill: string, extra = "") =>
		`<polygon points="${P(pts)}" fill="${fill}" ${extra}/>`;
	const line = (pts: readonly Pt[], w = 3) =>
		`<polygon points="${P(pts)}" class="k k${w}"/>`;
	const jq = (pts: readonly Pt[], j: number): Pt[] =>
		pts.map(([x, y]) => [x + (R() - 0.5) * 2 * j, y + (R() - 0.5) * 2 * j]);

	/** A tapered brush stroke along `pts`. */
	function brush(pts: readonly Pt[], w: number, fill = INK, extra = "") {
		const L: Pt[] = [];
		const Rt: Pt[] = [];
		for (let i = 0; i < pts.length; i++) {
			const [x, y] = pts[i] as Pt;
			const [ax, ay] = pts[Math.max(0, i - 1)] as Pt;
			const [bx, by] = pts[Math.min(pts.length - 1, i + 1)] as Pt;
			let nx = -(by - ay);
			let ny = bx - ax;
			const l = Math.hypot(nx, ny) || 1;
			nx /= l;
			ny /= l;
			const k = i / (pts.length - 1);
			const ww =
				(w * Math.sin(Math.PI * (0.08 + 0.84 * k)) * (0.8 + R() * 0.4)) / 2;
			L.push([x + nx * ww, y + ny * ww]);
			Rt.unshift([x - nx * ww, y - ny * ww]);
		}
		return poly(L.concat(Rt), fill, extra);
	}

	function hatchTile(step: number, len: number, w: number) {
		let h = "";
		for (let y = 2; y < 44; y += step) {
			let x = R() * -10;
			while (x < 44) {
				const l = len * 0.4 + R() * len;
				h += brush(
					[
						[x, y],
						[x + l / 2, y + (R() - 0.5)],
						[x + l, y],
					],
					w + R() * 0.5,
				);
				x += l + 3 + R() * 7;
			}
		}
		return h;
	}

	/** <defs> body: wobble filter, hatch and cross-hatch patterns, soft glow blur. */
	const defs = () => `
<filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="9"/><feDisplacementMap scale="3.6" in="SourceGraphic" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .5"/></feComponentTransfer></filter>
<pattern id="hatch" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">${hatchTile(5.5, 22, 1.5)}</pattern>
<pattern id="xhatch" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(42)">${hatchTile(6, 18, 1.3)}</pattern>`;

	/** Coursed ashlar wall between x0..x1, y0..y1. Returns [fills, ink]. */
	function wall(x0: number, x1: number, y0: number, y1: number, course = 26) {
		let fills = "";
		let lines = "";
		const tones = ["#2b1e16", "#32231a", "#271a13", "#2f2118", "#36271c"];
		for (let row = 0, y = y0; y < y1; row++, y += course) {
			let x = x0 - (row % 2 ? 34 : 8);
			while (x < x1) {
				const w = 44 + R() * 30;
				const q = jq(
					[
						[x, y],
						[x + w, y],
						[x + w, y + course],
						[x, y + course],
					],
					1.3,
				);
				fills += poly(q, pick(tones));
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
					fills += poly(
						[
							[x + w, y + course - 6 - R() * 8],
							[x + w, y + course],
							[x + w - 10 - R() * 14, y + course],
						],
						INK,
					);
				lines += line(q, 2);
				x += w;
			}
		}
		return [fills, lines] as const;
	}

	/**
	 * Flagstone floor in one-point perspective. `vx` vanishing x, `ft` far edge y,
	 * `fh` height to the near edge, `zf` depth at the far edge.
	 */
	function floor(
		vx: number,
		ft: number,
		fh: number,
		zf: number,
		rows: readonly number[],
		xs: readonly [number, number] = [-900, 1300],
	) {
		const fy = (Z: number) => ft + fh * ((1 / Z - 1 / zf) / (1 - 1 / zf));
		const fx = (X: number, Z: number) => vx + (X - vx) / Z;
		let fills = "";
		let lines = "";
		const tones = ["#1b120d", "#20160f", "#18100b", "#23180f", "#1d140e"];
		for (let i = 0; i < rows.length - 1; i++) {
			const Zf = rows[i] as number;
			const Zn = rows[i + 1] as number;
			const W = 96;
			const off = (i % 2) * W * 0.5 + R() * 10;
			for (let X = xs[0] + off; X < xs[1]; X += W) {
				const j = 0.6 + Math.max(0, zf - Zf) * 0.5;
				const [q0, q1, q2, q3] = jq(
					[
						[fx(X, Zf), fy(Zf)],
						[fx(X + W, Zf), fy(Zf)],
						[fx(X + W, Zn), fy(Zn)],
						[fx(X, Zn), fy(Zn)],
					],
					j,
				) as [Pt, Pt, Pt, Pt];
				const q = [q0, q1, q2, q3];
				fills += poly(q, pick(tones));
				lines += line(q, 2);
				if (R() < 0.6)
					lines += brush(
						[
							[q0[0] + 5, q0[1] + 2.2],
							[lerp(q0[0], q1[0], 0.5), lerp(q0[1], q1[1], 0.5) + 2],
							[q1[0] - 8, q1[1] + 2.2],
						],
						1.4,
						BONE_D,
						'opacity=".16"',
					);
				if (R() < 0.3) {
					const cx0 = lerp(q0[0], q2[0], 0.3 + R() * 0.4);
					const cy0 = lerp(q0[1], q2[1], 0.3 + R() * 0.4);
					lines += brush(
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
		return [fills, lines] as const;
	}

	return { R, poly, line, jq, brush, defs, wall, floor };
}

/** Round-headed arch outline: jambs from `bottom` up to `spring`, half circle over. */
export const archPath = (
	cx: number,
	r: number,
	spring: number,
	bottom: number,
) =>
	`M${f1(cx - r)} ${f1(bottom)} V${f1(spring)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r)} ${f1(spring)} V${f1(bottom)} Z`;

export function archPts(
	cx: number,
	r: number,
	spring: number,
	bottom: number,
	n = 18,
): Pt[] {
	const pts: Pt[] = [[cx - r, bottom]];
	for (let i = 0; i <= n; i++) {
		const a = Math.PI + (i / n) * Math.PI;
		pts.push([cx + Math.cos(a) * r, spring + Math.sin(a) * r]);
	}
	pts.push([cx + r, bottom]);
	return pts;
}

/** Points evenly spaced along an arch's jambs and head (for studs, voussoirs). */
export function alongArch(
	cx: number,
	r: number,
	spring: number,
	bottom: number,
	n: number,
): Pt[] {
	const side = bottom - spring;
	const arc = Math.PI * r;
	const total = 2 * side + arc;
	const pts: Pt[] = [];
	for (let i = 0; i < n; i++) {
		let d = (i / (n - 1)) * total;
		if (d <= side) {
			pts.push([cx - r, bottom - d]);
			continue;
		}
		d -= side;
		if (d <= arc) {
			const a = Math.PI + d / r;
			pts.push([cx + Math.cos(a) * r, spring + Math.sin(a) * r]);
			continue;
		}
		d -= arc;
		pts.push([cx + r, spring + d]);
	}
	return pts;
}

/** Wrap drawing in a standalone SVG document with the ink stroke classes. */
export function svgDoc(
	vb: readonly [number, number, number, number],
	defs: string,
	inner: string,
) {
	const k = `<style>.k{fill:none;stroke:${INK};stroke-linejoin:round;stroke-linecap:round}.k2{stroke-width:${2 * INK_W}px}.k3{stroke-width:${3 * INK_W}px}.k4{stroke-width:${4.5 * INK_W}px}.k6{stroke-width:${6 * INK_W}px}.scr{mix-blend-mode:screen}</style>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" width="${vb[2]}" height="${vb[3]}">${k}<defs>${defs}</defs>${inner}</svg>`;
}

export const svgURL = (svg: string) =>
	`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
