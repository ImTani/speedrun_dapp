export type AspectKey =
	| "mercy"
	| "hunger"
	| "echo"
	| "rancour"
	| "appetite"
	| "inquisitor"
	| "madness";

export type MaskVariant = "gilded" | "grisaille" | "ink";

export interface MaskOptions {
	/** Material treatment. Default "gilded". */
	variant?: MaskVariant;
	/** Ember eyes behind the eye holes. */
	glow?: boolean;
	/** No flicker on the ember eyes (reduced motion). */
	still?: boolean;
	/** Darkness behind the eye holes (when not glowing). */
	void?: boolean;
	/** "space" (default): shared 100 x 84 mask space. "square": size x size, framed on this mask. */
	fit?: "space" | "square";
	/** Accessible name; without it the SVG is aria-hidden. */
	title?: string | undefined;
	/** Stable id suffix (e.g. from React useId) so server and client markup match. */
	id?: string;
}

export const ASPECT_KEYS: readonly AspectKey[];

export const MASK: {
	/** The mask as SVG markup. Starts with "<svg " and ends with "</svg>". */
	mask(
		aspect: AspectKey | string,
		width?: number,
		opts?: MaskOptions | MaskVariant,
	): string;
	ASPECTS: Record<AspectKey, string>;
	/** Eye centres per mask in mask space (viewBox 0 0 100 84). */
	EYES: Record<AspectKey, [number, number][]>;
	KEYS: readonly AspectKey[];
};
