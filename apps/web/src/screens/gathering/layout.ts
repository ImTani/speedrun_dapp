// How the fixed 390 x 844 ink stage fills the screen: always full-bleed (COVER), never letterboxed.
//
// Phones are wider (in aspect) than the drawing once the tab bar is taken away, so the stage is
// scaled to the full width and cropped top and bottom: the dark vault above the windows and the
// far floor are what give way. The windows are pinned just under the phase banner. Only on boxes
// that are wide and short (landscape, desktop) does the drawing narrow, and then its sides melt
// into the vault darkness instead of showing bars.
import type { StageGeom } from "@/scene/inkStage.js";

/** Mirrors the geometry inkStage.js returns as `stage.geom` (checked at mount in development). */
export const GEOM: StageGeom = {
	W: 390,
	H: 844,
	GW: 128,
	GH: (128 * 420) / 300,
	GTOP: 118,
	GBOT: 118 + (128 * 420) / 300,
	SPRING: 118 + 64,
	SC: 118 + (128 * 420) / 300 + 31,
	FT: 430,
	pier: 195,
	win: { A: { cx: 97 }, B: { cx: 293 } },
	tint: { A: "#e9c27a", B: "#f0a95a" },
};

export interface StageFit {
	/** Screen px per world px. */
	s: number;
	/** World x at the left edge of the box, and world y at its top. */
	ox: number;
	oy: number;
	/** World rows visible. */
	top: number;
	bottom: number;
	/** True when the drawing is narrower than the box (wide screens only). */
	narrow: boolean;
	/** The box itself (px). */
	w: number;
	h: number;
	/** World point -> box px. */
	x: (wx: number) => number;
	y: (wy: number) => number;
}

/**
 * @param w box width (px)
 * @param h box height (px)
 * @param hud height of the banner over the vault (px, including the top safe area)
 */
export function fitStage(
	w: number,
	h: number,
	hud: number,
	g = GEOM,
): StageFit {
	// Top of the hood moulding over the windows: the first thing that must show.
	const focusTop = g.SPRING - g.GW / 2 - 36;
	const gap = 4;
	const head = hud + gap;
	// The deepest floor row we may show (below the drawing the stage is plain ink, hidden by
	// the bottom shade), and the least floor we accept before narrowing the drawing.
	const maxBottom = g.H + 48;
	const minBottom = g.FT + 170;
	const W = Math.max(1, w),
		H = Math.max(1, h);
	let s = W / g.W;
	const bottomAt = (sc: number) => focusTop - head / sc + H / sc;
	if (bottomAt(s) > maxBottom) s = (H - head) / (maxBottom - focusTop);
	else if (bottomAt(s) < minBottom)
		s = Math.max(0.2, (H - head) / (minBottom - focusTop));
	const oy = focusTop - head / s;
	const ox = (g.W - W / s) / 2;
	return {
		s,
		ox,
		oy,
		top: oy,
		bottom: oy + H / s,
		narrow: ox < -0.5,
		w: W,
		h: H,
		x: (wx) => (wx - ox) * s,
		y: (wy) => (wy - oy) * s,
	};
}
