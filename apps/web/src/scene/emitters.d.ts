export type EmitterKind = "glass" | "candle" | "ember" | "gilt";

export type EmitterColor = string | readonly [number, number, number];

export interface EmitterSpec {
	kind: EmitterKind;
	/** The element the emitter rides on; x, y and radius are then relative to its painted box. */
	anchor?: Element | null;
	/** Position: a fraction of the anchor's box (default 0.5), or viewport CSS px without one. */
	x?: number;
	y?: number;
	/** Reach of its light: anchor widths, or CSS px without an anchor. */
	radius?: number;
	/** Candles: where it stands (same units as y); its warm floor pool is drawn there. */
	base?: number;
	/** Unanchored glass only: its box in CSS px. */
	w?: number;
	h?: number;
	color?: EmitterColor;
	/** Default 1; 0 hides it without unregistering. */
	intensity?: number;
	/** 0..1: de-synchronises flicker and twinkle (default: a per-emitter hash). */
	phase?: number;
}

export interface Emitter
	extends Required<Omit<EmitterSpec, "anchor" | "base" | "w" | "h" | "color">> {
	anchor?: Element | null;
	base?: number;
	w?: number;
	h?: number;
	color?: EmitterColor;
	/** The colour, resolved to 0..1 RGB. */
	rgb: [number, number, number];
}

export interface EmitterHandle {
	update(p: Partial<EmitterSpec>): void;
	remove(): void;
}

export function registerEmitter(spec: EmitterSpec): EmitterHandle;
export function allEmitters(): ReadonlySet<Emitter>;
export function onEmitters(fn: () => void): () => void;
export function rgbOf(
	c: EmitterColor | undefined,
	fallback?: [number, number, number],
): [number, number, number];
