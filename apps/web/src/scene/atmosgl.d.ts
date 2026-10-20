import type { AtmosphereLook, BASE } from "./atmosphere";

export interface AtmosphereApi {
	/** New strengths (a preset or a tuned look); redraws on the next frame. */
	set(look: AtmosphereLook): void;
	/** Move the floor line (from the top, in box heights; null = just under the lowest window). */
	setFloor(y: number | null): void;
	destroy(): void;
}

export function mountAtmosphere(o: {
	canvas: HTMLCanvasElement;
	/** The scene root: its lit glass and registered emitters light this layer. */
	scope: Element;
	look: AtmosphereLook;
	base: typeof BASE;
	lean?: number;
	rise?: number;
	floor?: number | null;
	reduce?: boolean;
}): AtmosphereApi | null;
