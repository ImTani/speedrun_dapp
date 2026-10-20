/** Milliseconds between lens frames (about 30 fps). */
export const FRAME_MS: number;
/** The full-screen quad's vertex shader (attribute 0, `aP`; passes `vUv`). */
export const VERT: string;

export type LensPass = (target: HTMLCanvasElement, render: () => void) => void;

export interface LensSpec {
	/** The 2D canvases this view paints; it sleeps while none is on screen. */
	targets: HTMLCanvasElement[];
	/** True (or a function returning true) while the view animates on its own. */
	live: boolean | (() => boolean);
	/** Build textures on the current context; runs again after the context is rebuilt. */
	setup(
		gl: WebGL2RenderingContext,
		texture: (src: TexImageSource) => WebGLTexture,
	): void;
	/** Render; call `pass(target, render)` once per target. */
	draw(gl: WebGL2RenderingContext, now: number, pass: LensPass): void;
	/** Free what the view made beyond its textures (framebuffers); called on remove. */
	dispose?(gl: WebGL2RenderingContext): void;
}

export interface LensView {
	/** Draw on the next frame (reduced motion, or a change of look). */
	invalidate(): void;
	remove(): void;
}

/** A small GPU copy of each frame the lens draws to one target canvas. */
export interface LensTap {
	readonly target: HTMLCanvasElement;
	/** The copy (GL orientation: row 0 is the bottom), or null before the first draw. */
	texture(): WebGLTexture | null;
	/** Called after each draw of the target (reduced motion: redraw what reads it). */
	onDraw(fn: (() => void) | null): void;
	release(): void;
}
export function tap(target: HTMLCanvasElement): LensTap;
/** An offscreen RGBA8 render target on the current context: [texture, framebuffer]. */
export function renderTarget(
	gl: WebGL2RenderingContext,
	w: number,
	h: number,
): [WebGLTexture, WebGLFramebuffer];

/** True when WebGL2 is here and every given fragment shader compiles. */
export function lensReady(...frags: string[]): boolean;
export function addView(spec: LensSpec): LensView;
export function program(gl: WebGL2RenderingContext, frag: string): WebGLProgram;
export function uniform(
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	name: string,
): WebGLUniformLocation | null;
export function upload(
	gl: WebGL2RenderingContext,
	tex: WebGLTexture | null,
	src: TexImageSource,
): WebGLTexture;
export function bind(gl: WebGL2RenderingContext, list: WebGLTexture[]): void;
/** Ease toward `to` at a per-60fps-frame rate `k`, for a step of `dt` seconds. */
export function ease(cur: number, to: number, k: number, dt: number): number;
