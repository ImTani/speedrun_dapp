export const FLOOR: {
	mount(o: {
		canvas: HTMLCanvasElement;
		a: { theme: string; seed: number };
		b: { theme: string; seed: number };
		zf?: number;
		vx?: number;
		state: unknown;
	}): Promise<{ stop(): void } | null>;
};
