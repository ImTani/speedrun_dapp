export interface StageSide {
	/** Aspect index 0..6 (kept for callers; the glass art per window is fixed). */
	aspect?: number;
	/** Medallions already lit around the window (0..25). */
	lit?: number;
}
export interface StageDuelSide extends StageSide {
	/** 0 = Kindle, 1 = Devour */
	move: number;
	/** Light gained this duel (medallions that pop in the tally). */
	gain: number;
}
export interface StageDuel {
	a: StageDuelSide;
	b: StageDuelSide;
	/** Playback rate multiplier (a backlog plays faster). */
	speed?: number;
}

/** The outcome the stage is playing. */
export type StageKind = "idle" | "devour" | "kindle" | "ruin";
/** Beats of one duel, in order. */
export type StageBeat = "hush" | "reveal" | "tally" | "end";
export interface StageBeatInfo {
	kind: StageKind;
	/** Timeline seconds per wall-clock second. */
	rate: number;
	/** Wall-clock seconds from this beat to the next at the current rate (0 for "end"). */
	until: number;
}

/** World geometry of the fixed 390 x 844 drawing (CSS px before scaling). */
export interface StageGeom {
	W: number;
	H: number;
	/** Glass width and height of each window. */
	GW: number;
	GH: number;
	/** Top and bottom of the glass. */
	GTOP: number;
	GBOT: number;
	/** Where the window's arch springs (centre of the arch circle). */
	SPRING: number;
	/** Top of the stone string course under the sills. */
	SC: number;
	/** Where the floor meets the wall. */
	FT: number;
	/** Centre line of the pier between the windows (and the floor's vanishing x). */
	pier: number;
	win: { A: { cx: number }; B: { cx: number } };
	tint: { A: string; B: string };
}

export interface Stage {
	geom: StageGeom;
	setPair(a: StageSide, b: StageSide): void;
	play(duel: StageDuel): Promise<void>;
	/** A tap: hasten to the unveiling, or past it to the settled outcome. */
	skip(): void;
	/** Tell the stage which world rows are visible (it keeps the floor eye in view). */
	setView(view: { top: number; bottom: number }): void;
	destroy(): void;
}
export function mountStage(
	root: HTMLElement,
	opts?: {
		onBeat?: (beat: StageBeat, info: StageBeatInfo) => void;
	},
): Promise<Stage>;
