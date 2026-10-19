export interface GlassApi {
	params: Record<string, number>;
	dim(v: number): void;
	red(v: number): void;
	crack(v: number): void;
	cloud(x: number, amount?: number): void;
	set(k: string, v: number): void;
	swell(): void;
	destroy(): void;
}
export const GL: {
	mount(o: {
		winCanvas: HTMLCanvasElement;
		causticCanvas?: HTMLCanvasElement;
		theme?: string;
		seed?: number;
		preset?: string;
		causticBoost?: number;
		causticReach?: number;
		causticFloor?: boolean;
	}): Promise<GlassApi | null>;
	PRESETS: Record<string, Record<string, number>>;
};
