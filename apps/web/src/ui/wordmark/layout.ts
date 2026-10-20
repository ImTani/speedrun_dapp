/**
 * The lockup's geometry, in SVG user units where the name's em is about 100 units (so
 * every filter radius in Defs.tsx is a fixed fraction of the letter, at any size).
 * Pure numbers from the glyph tables: the same on the server and the client.
 */
import {
	type IlluminatedVariant,
	isIlluminated,
	WORDMARK_NAME,
	WORDMARK_SUB,
	type WordmarkLayout,
	type WordmarkVariant,
} from "./config";
import { FALLBACK_GLYPH, type Face, GLYPHS } from "./metrics";

export type Box = { x0: number; y0: number; x1: number; y1: number };

/** One line of glyphs placed by hand: `xs` is each character's pen position. */
export type Run = {
	face: Face;
	text: string;
	size: number;
	xs: number[];
	y: number;
	/** Ink bounds of the placed glyphs. */
	ink: Box;
	/** Pen travel without the trailing letterspace. */
	width: number;
};

/** A rule ornament; `inner` is the end that points at the words. */
export type Rule = { x0: number; x1: number; y: number; inner: "l" | "r" };

/** The square panel of the hybrid's initial. */
export type Panel = { x: number; y: number; s: number };

export type MarkLayout = {
	variant: WordmarkVariant;
	layout: WordmarkLayout;
	name: Run[];
	panel?: Panel | undefined;
	sub: Run;
	rules: Rule[];
	/** Rule thickness/ornament scale (units). */
	ruleSize: number;
	nameBox: Box;
	subBox: Box;
	box: Box;
};

export type WordmarkPart = "all" | "name" | "sub";

const r2 = (n: number) => Math.round(n * 100) / 100;

const union = (...b: Box[]): Box => ({
	x0: Math.min(...b.map((x) => x.x0)),
	y0: Math.min(...b.map((x) => x.y0)),
	x1: Math.max(...b.map((x) => x.x1)),
	y1: Math.max(...b.map((x) => x.y1)),
});

export function run(
	face: Face,
	text: string,
	size: number,
	x: number,
	y: number,
	track = 0,
): Run {
	const g = GLYPHS[face];
	const xs: number[] = [];
	const ink: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
	let pen = x;
	for (const ch of text) {
		const m = g[ch] ?? FALLBACK_GLYPH;
		xs.push(r2(pen));
		if (m[2] > m[1]) {
			ink.x0 = Math.min(ink.x0, pen + m[1] * size);
			ink.x1 = Math.max(ink.x1, pen + m[2] * size);
			ink.y0 = Math.min(ink.y0, y - m[4] * size);
			ink.y1 = Math.max(ink.y1, y - m[3] * size);
		}
		pen += (m[0] + track) * size;
	}
	return { face, text, size, xs, y, ink, width: pen - x - track * size };
}

/** A run centred on `cx` (by pen travel). */
function centred(
	face: Face,
	text: string,
	size: number,
	cx: number,
	y: number,
	track = 0,
): Run {
	const w = run(face, text, size, 0, y, track).width;
	return run(face, text, size, cx - w / 2, y, track);
}

const SUB = WORDMARK_SUB.toUpperCase();
const SUB_TRACK = 0.3;

/** The rubric under the name, centred, with a rule either side. */
function subUnder(cx: number, baseline: number, S: number, track = SUB_TRACK) {
	const sub = centred("rubric", SUB, S, cx, baseline, track);
	const mid = baseline - 0.36 * S;
	const gap = 0.7 * S;
	const len = 1.9 * S;
	const x0 = sub.xs[0] ?? cx;
	const x1 = x0 + sub.width;
	const rules: Rule[] = [
		{ x0: x0 - gap - len, x1: x0 - gap, y: mid, inner: "r" },
		{ x0: x1 + gap, x1: x1 + gap + len, y: mid, inner: "l" },
	];
	return { sub, rules };
}

/** The rubric after the name on one line, led in by a single rule. */
function subAfter(x: number, mid: number, S: number, track = SUB_TRACK) {
	const len = 1.4 * S;
	const gap = 0.6 * S;
	const rule: Rule = { x0: x, x1: x + len, y: mid, inner: "r" };
	const sub = run("rubric", SUB, S, x + len + gap, mid + 0.36 * S, track);
	return { sub, rules: [rule] };
}

function ruleBox(rules: Rule[], k: number): Box[] {
	return rules.map((r) => ({
		x0: r.x0,
		x1: r.x1,
		y0: r.y - k,
		y1: r.y + k,
	}));
}

function finish(
	variant: WordmarkVariant,
	layout: WordmarkLayout,
	name: Run[],
	sub: Run,
	rules: Rule[],
	ruleSize: number,
	panel?: Panel,
): MarkLayout {
	const pb: Box[] = panel
		? [
				{
					x0: panel.x,
					y0: panel.y,
					x1: panel.x + panel.s,
					y1: panel.y + panel.s,
				},
			]
		: [];
	const nameBox = union(...name.map((r) => r.ink), ...pb);
	const subBox = union(sub.ink, ...ruleBox(rules, ruleSize * 1.6));
	return {
		variant,
		layout,
		name,
		panel,
		sub,
		rules,
		ruleSize,
		nameBox,
		subBox,
		box: union(nameBox, subBox),
	};
}

/** Half the x-height (or small-cap height), in em: where a one-line rubric centres. */
const MID = {
	gothic: 0.24,
	fraktur: 0.27,
	caps: 0.36,
	rubric: 0.36,
} satisfies Partial<Record<Face, number>>;

/**
 * The illuminated capital: its face, its size against the Fraktur's 100, and the gap after it
 * (units). Sized so each A stands about as tall as Maguntia's own (0.71 em) over the lowercase.
 */
const INITIAL: Record<
	IlluminatedVariant,
	{ face: Face; size: number; gap: number }
> = {
	b1: { face: "gothic6", size: 110, gap: 1 },
	b2: { face: "drawn", size: 100, gap: 0 },
	b3: { face: "cook", size: 100, gap: -1 },
};

function nameRuns(variant: WordmarkVariant, layout: WordmarkLayout) {
	const stacked = layout === "stacked";
	if (isIlluminated(variant)) {
		// The capital from its own face (or drawn), then Maguntia's lowercase.
		const i = INITIAL[variant];
		const cap = run(i.face, WORDMARK_NAME.slice(0, 1), i.size, 0, 0);
		const rest = run(
			"fraktur",
			WORDMARK_NAME.slice(1),
			100,
			cap.width + i.gap,
			0,
		);
		return { runs: [cap, rest], mid: MID.fraktur * 100 };
	}
	switch (variant) {
		case "engraved":
			return {
				runs: [run("caps", WORDMARK_NAME.toUpperCase(), 58, 0, 0, 0.1)],
				mid: MID.caps * 58,
			};
		case "hybrid": {
			// The initial sits in its panel; the rest follows in small capitals.
			const s = stacked ? 112 : 92;
			const py = stacked ? 0 : -78;
			const A = WORDMARK_NAME.slice(0, 1);
			const size = stacked ? 124 : 104;
			// Grenze Gotisch's A: a Fraktur A reads as "U" to most eyes today.
			const a0 = run("gothic", A, size, 0, 0);
			const ax = (s - (a0.ink.x1 - a0.ink.x0)) / 2 - a0.ink.x0;
			const ay = py + s / 2 - (a0.ink.y0 + a0.ink.y1) / 2;
			const cap = run("gothic", A, size, ax, ay);
			const restSize = stacked ? 72 : 62;
			const rest = run(
				"caps",
				WORDMARK_NAME.slice(1).toLowerCase(),
				restSize,
				s + (stacked ? 12 : 10),
				stacked ? 58 : 0,
				0.05,
			);
			return {
				runs: [cap, rest],
				panel: { x: 0, y: py, s } as Panel,
				mid: 0.3 * restSize,
			};
		}
		default:
			return {
				runs: [run("gothic", WORDMARK_NAME, 100, 0, 0)],
				mid: MID.gothic * 100,
			};
	}
}

export function layoutMark(
	variant: WordmarkVariant,
	layout: WordmarkLayout,
): MarkLayout {
	const { runs, panel, mid } = nameRuns(variant, layout);
	const ink = union(...runs.map((r) => r.ink));
	if (layout === "horizontal") {
		const S = variant === "engraved" ? 20 : variant === "hybrid" ? 22 : 27;
		const lead = variant === "engraved" ? 18 : 22;
		const { sub, rules } = subAfter(ink.x1 + lead, -mid, S);
		return finish(variant, layout, runs, sub, rules, S * 0.2, panel);
	}
	if (variant === "hybrid" && panel) {
		// Drop-cap lockup: the rubric runs under "postasy", beside the panel.
		const rest = runs[1] ?? runs[0];
		const cx = rest ? (rest.ink.x0 + rest.ink.x1) / 2 : 200;
		const { sub, rules } = subUnder(cx, panel.y + panel.s - 12, 16);
		return finish(variant, layout, runs, sub, rules, 16 * 0.2, panel);
	}
	const S = variant === "engraved" ? 17 : 18.5;
	const gap = variant === "engraved" ? 12 : 9;
	const cx = (ink.x0 + ink.x1) / 2;
	const track = variant === "engraved" ? 0.32 : SUB_TRACK;
	const { sub, rules } = subUnder(cx, ink.y1 + gap + 0.72 * S, S, track);
	return finish(variant, layout, runs, sub, rules, S * 0.2, panel);
}

/** Room around the ink for each lettering's outline and cast shadow (t, r, b, l). */
const PAD: Record<WordmarkVariant, [number, number, number, number]> = {
	gilded: [8, 8, 12, 8],
	b1: [7, 7, 10, 7],
	b2: [7, 7, 10, 7],
	b3: [7, 7, 10, 7],
	engraved: [5, 5, 7, 5],
	hybrid: [6, 6, 9, 6],
};

/** The part's box with its padding: [x, y, w, h]. */
export function partBox(
	m: MarkLayout,
	part: WordmarkPart,
): [number, number, number, number] {
	const b = part === "name" ? m.nameBox : part === "sub" ? m.subBox : m.box;
	const [t, r, bo, l] = PAD[m.variant];
	return [
		r2(b.x0 - l),
		r2(b.y0 - t),
		r2(b.x1 - b.x0 + l + r),
		r2(b.y1 - b.y0 + t + bo),
	];
}

/** The rendered size in name-ems (100 units): what `size` multiplies. */
export function wordmarkEm(
	variant: WordmarkVariant,
	layout: WordmarkLayout = "stacked",
	part: WordmarkPart = "all",
): { w: number; h: number } {
	const [, , w, h] = partBox(layoutMark(variant, layout), part);
	return { w: w / 100, h: h / 100 };
}
