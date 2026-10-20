/**
 * Particle colours. Ink, bone, ember, gilt and blood like the rest of the
 * game; the stained glass blues and greens only for shards and rare glints.
 */
export const FX = {
	gilt: "#f0cf7a",
	giltHi: "#f5dfa0",
	giltWhite: "#fff1c4",
	giltD: "#c9a24f",
	ember: "#ff8a4a",
	emberHi: "#ffb27a",
	emberD: "#ff6a4a",
	blood: "#a51d22",
	bloodL: "#c7262c",
	bone: "#e9dcbc",
	ash: "#8a8279",
	ashL: "#a9a199",
	ashD: "#5c554f",
	glassBlue: "#3f7fc0",
	glassCyan: "#5fb3c9",
	glassGreen: "#3f9a72",
	glassJade: "#86c9a3",
	glassViolet: "#6a4fa0",
} as const;

export type FxPalette = readonly string[];

export const PALETTES = {
	/** Warm drifting sparks. */
	embers: [FX.ember, FX.emberHi, FX.emberD, FX.gilt],
	/** Golden light. */
	gilt: [FX.gilt, FX.giltHi, FX.giltWhite, FX.giltD],
	/** Broken stained glass. */
	glass: [
		FX.glassBlue,
		FX.glassCyan,
		FX.glassGreen,
		FX.glassJade,
		FX.glassViolet,
		FX.gilt,
	],
	/** Devour: glass cut with blood. */
	devour: [FX.blood, FX.bloodL, FX.glassBlue, FX.glassViolet, FX.bone],
	/** Grey flecks. */
	ash: [FX.ash, FX.ashL, FX.ashD, "#4a4440"],
} as const satisfies Record<string, FxPalette>;

export type PaletteName = keyof typeof PALETTES;
