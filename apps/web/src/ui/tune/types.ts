import type { FontKind } from "./fonts.ts";

/**
 * A tuning spec: the controls a screen offers, grouped in sections, plus whole-look presets.
 * Each control owns one value (keyed by `key`) and writes it as `${prefix}${key}` on the
 * screen's root. A value equal to its default is removed instead, so the stylesheet's own
 * default (the shipped look) applies.
 */
export type TuneValue = string | number;
export type TuneValues = Record<string, TuneValue>;

export type CaseMode = "as-written" | "small-caps" | "uppercase";
export type StyleMode = "normal" | "italic";

interface Base {
	key: string;
	label: string;
}

export type TuneControl =
	| (Base & {
			kind: "font";
			def: string;
			/** The weight control to snap when the face changes. */
			weightKey?: string;
			prefer: readonly FontKind[];
	  })
	| (Base & { kind: "weight"; def: number; fontKey: string })
	| (Base & {
			kind: "range";
			def: number;
			min: number;
			max: number;
			step: number;
			/** Appended to the value in CSS ("em"); none for multipliers. */
			unit?: string;
			/** Shown after the number in the panel ("x", "em"). */
			suffix?: string;
	  })
	| (Base & {
			kind: "color";
			def: string;
			/** Further variables that take the same value (removed with it at default). */
			also?: readonly string[];
	  })
	/** Writes `<base>-transform` and `<base>-caps`, where key is `<base>-case`. */
	| (Base & { kind: "case"; def: CaseMode })
	| (Base & { kind: "style"; def: StyleMode });

export interface TuneSwatch {
	name: string;
	/** Colours drawn on the swatch button, top to bottom. */
	chips: readonly string[];
	values: TuneValues;
}

export type TuneItem =
	| TuneControl
	| { kind: "swatches"; label: string; items: readonly TuneSwatch[] }
	| { kind: "note"; text: string };

export interface TuneSection {
	id: string;
	label: string;
	items: readonly TuneItem[];
}

export interface TunePreset {
	id: string;
	name: string;
	note: string;
	values: TuneValues;
}

export interface TuneSpec {
	/** Prefix of the CSS variables written on the root ("--g-"). */
	prefix: string;
	/** Name stamped into copied values. */
	name: string;
	storageKey: string;
	sections: readonly TuneSection[];
	/** The first preset should be the shipped look (no values). */
	presets: readonly TunePreset[];
}
