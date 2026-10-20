/**
 * Glyph metrics for the lockup, in em: [advance, xMin, xMax, yMin, yMax] (y up, baseline 0).
 * Read from the Google Fonts TTFs of the faces next/font serves (hmtx + glyf), so the
 * wordmark is laid out to the glyph on the server: no measuring, no shift when fonts land.
 * Kerning is not applied (each glyph is placed by these advances).
 *
 *   gothic   Grenze Gotisch 900     fraktur  UnifrakturMaguntia 400
 *   caps     Cinzel 900             rubric   Cinzel 700
 *   gothic6  Grenze Gotisch 600     cook     UnifrakturCook 700     (the B1 / B3 initial A)
 *   drawn    the B2 initial A: not a font, a path (glyphs.ts)
 */
import { DRAWN_A } from "./glyphs";

export type Face =
	| "gothic"
	| "fraktur"
	| "caps"
	| "rubric"
	| "gothic6"
	| "cook"
	| "drawn";
export type GlyphMetric = readonly [number, number, number, number, number];

export const GLYPHS: Record<Face, Record<string, GlyphMetric>> = {
	gothic: {
		A: [0.635, 0.039, 0.611, -0.014, 0.645],
		p: [0.497, 0.015, 0.473, -0.185, 0.473],
		o: [0.499, 0.024, 0.475, -0.012, 0.473],
		s: [0.394, 0.02, 0.381, -0.012, 0.473],
		t: [0.346, -0.002, 0.34, -0.012, 0.581],
		a: [0.466, 0.028, 0.457, -0.012, 0.473],
		y: [0.457, 0.001, 0.458, -0.185, 0.473],
	},
	fraktur: {
		A: [0.814, 0.022, 0.789, -0.012, 0.712],
		p: [0.451, 0.003, 0.429, -0.199, 0.59],
		o: [0.414, -0.001, 0.388, -0.009, 0.511],
		s: [0.417, 0.025, 0.392, 0, 0.605],
		t: [0.309, 0.014, 0.289, -0.014, 0.635],
		a: [0.46, 0.026, 0.435, -0.021, 0.5],
		y: [0.468, 0.03, 0.446, -0.165, 0.593],
	},
	caps: {
		A: [0.72, -0.04, 0.76, 0, 0.724],
		// biome-ignore lint/suspicious/noApproximativeNumericConstant: a glyph advance, not 1/sqrt(2)
		P: [0.707, 0.035, 0.695, 0, 0.7],
		O: [0.905, 0.035, 0.866, -0.014, 0.714],
		S: [0.645, 0.043, 0.61, -0.014, 0.714],
		T: [0.698, 0.01, 0.689, 0, 0.719],
		Y: [0.729, -0.045, 0.775, 0, 0.7],
		p: [0.607, 0.021, 0.596, 0, 0.6],
		o: [0.779, 0.025, 0.754, -0.012, 0.612],
		s: [0.549, 0.038, 0.519, -0.012, 0.612],
		t: [0.613, 0.007, 0.606, 0, 0.616],
		a: [0.632, -0.042, 0.676, 0, 0.636],
		y: [0.633, -0.048, 0.684, 0, 0.6],
	},
	gothic6: {
		A: [0.61, 0.044, 0.583, -0.011, 0.63],
	},
	cook: {
		A: [0.686, 0.008, 0.677, -0.17, 0.75],
	},
	drawn: {
		A: DRAWN_A.metric,
	},
	rubric: {
		S: [0.578, 0.049, 0.535, -0.014, 0.714],
		E: [0.632, 0.042, 0.606, 0, 0.718],
		D: [0.828, 0.042, 0.788, 0, 0.7],
		V: [0.728, -0.028, 0.756, -0.02, 0.7],
		A: [0.717, -0.028, 0.745, 0, 0.72],
		C: [0.78, 0.045, 0.731, -0.014, 0.714],
		N: [0.865, 0.03, 0.835, -0.014, 0.715],
		T: [0.667, 0.014, 0.654, 0, 0.719],
		" ": [0.25, 0, 0, 0, 0],
	},
};

/** Unknown letters (should the words change) get a plain em-ish box. */
export const FALLBACK_GLYPH: GlyphMetric = [0.6, 0.03, 0.57, 0, 0.7];
