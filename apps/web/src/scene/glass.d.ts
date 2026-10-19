export interface WindowSVGOpts {
	theme?: string;
	seed?: number;
	mode?: "color" | "lead" | "glow";
	width?: number;
}
export const G: {
	windowSVG(opts: WindowSVGOpts): string;
	[k: string]: unknown;
};
