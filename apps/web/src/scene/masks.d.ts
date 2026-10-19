export type AspectKey =
	| "mercy"
	| "hunger"
	| "echo"
	| "rancour"
	| "appetite"
	| "inquisitor"
	| "madness";
export const MASK: {
	mask(aspect: AspectKey, width?: number): string;
	ASPECTS: Record<AspectKey, string>;
};
