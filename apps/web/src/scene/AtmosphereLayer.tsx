"use client";

/**
 * Atmosphere: post-processing for a scene, laid over its layers and under every word.
 *
 *   <div className={scene}>          (the scene root: its glass and emitters are found in here)
 *     ...ink, glass, candles...      (candles, ember eyes, gilt: registerEmitter, emitters.js)
 *     <Atmosphere floor={0.58} onLight={setShaderLight} />
 *   </div>
 *   ...UI, in a later and higher layer...
 *
 * Mount it as the LAST child of the scene root (or right after the layers it should light, when
 * later siblings are UI), inside the scene's own stacking context and never around UI: its layers
 * blend (screen, soft-light, overlay) with what is painted beneath. Presets and the pass list:
 * atmosphere.ts. `?fx=off|balanced|rich` compares them; `?fxbloom=1.4` (any key) nudges one.
 */
import { useReducedMotion } from "motion/react";
import {
	type CSSProperties,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { AtmosphereApi } from "./atmosgl.js";
import {
	ATMOSPHERE_PRESET,
	ATMOSPHERES,
	type AtmosphereLook,
	type AtmosphereName,
	atmosphereFromSearch,
	BASE,
	needsLight,
} from "./atmosphere";
import s from "./atmosphere.module.css";

/** Side of the grain tile, in noise pixels. */
const TILE = 128;
let tileURL: string | null = null;

/** Mid-grey film grain (sigma ~0.15), made once per page. */
function grainTile(): string | null {
	if (tileURL) return tileURL;
	const c = document.createElement("canvas");
	c.width = TILE;
	c.height = TILE;
	const x = c.getContext("2d");
	if (!x) return null;
	const img = x.createImageData(TILE, TILE);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		// Sum of three uniforms: near-gaussian, sigma 0.5 around 1.5.
		const n = Math.random() + Math.random() + Math.random() - 1.5;
		const v = Math.max(0, Math.min(255, Math.round(128 + n * 76)));
		d[i] = v;
		d[i + 1] = v;
		d[i + 2] = v;
		d[i + 3] = 255;
	}
	x.putImageData(img, 0, 0);
	tileURL = c.toDataURL("image/png");
	return tileURL;
}

const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v));

export function Atmosphere({
	floor = 0.62,
	lean = 0.14,
	rise = 0.9,
	preset = ATMOSPHERE_PRESET,
	opaque = true,
	onLight,
	className,
	style,
}: {
	/**
	 * The floor line, from the top, in box heights: the glass spill pools below it. "auto" puts it
	 * just under the lowest window (scenes whose height follows their content).
	 */
	floor?: number | "auto";
	/** Horizontal px of shaft per vertical px (+ leans down to the right). */
	lean?: number;
	/** The light's height above the top edge, in box heights (higher = straighter shafts). */
	rise?: number;
	/** The preset when the URL names none. */
	preset?: AtmosphereName;
	/**
	 * The scene paints every pixel under this box (default). When parts are transparent (masked
	 * sides), pass false: the warm soft-light tint is dropped (it would show itself there).
	 */
	opaque?: boolean;
	/**
	 * Whether the shader light layer is drawing (rays, flame halos, dust): a scene can retire
	 * its hand-drawn shafts, glows and motes.
	 */
	onLight?: (on: boolean) => void;
	className?: string;
	/** Extra root style (e.g. an inset that bleeds past the scene's padding, like its floor). */
	style?: CSSProperties;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const api = useRef<AtmosphereApi | null>(null);
	const [look, setLook] = useState<AtmosphereLook>(ATMOSPHERES[preset]);
	const [tile, setTile] = useState<{ url: string; size: number } | null>(null);
	const reduce = !!useReducedMotion();
	const report = useEffectEvent((on: boolean) => onLight?.(on));
	const floorY = floor === "auto" ? null : floor;
	const current = useEffectEvent(() => ({ look, floor: floorY }));

	// The URL may name another preset or nudge a strength (client only: no hydration change).
	useEffect(() => {
		setLook(atmosphereFromSearch(window.location.search, preset));
	}, [preset]);

	// ---- the shader light layer (rays, bloom, emitters, spill, particles) on the shared lens ----
	const gpu = needsLight(look);
	useEffect(() => {
		const canvas = canvasRef.current;
		const scope = rootRef.current?.parentElement;
		if (!gpu || !canvas || !scope) return;
		let alive = true;
		let mounted: AtmosphereApi | null = null;
		import("./atmosgl.js")
			.then(({ mountAtmosphere }) => {
				if (!alive) return;
				const now = current();
				mounted = mountAtmosphere({
					canvas,
					scope,
					look: now.look,
					base: BASE,
					lean,
					rise,
					floor: now.floor,
					reduce,
				});
				api.current = mounted;
				report(!!mounted);
			})
			.catch(() => report(false));
		return () => {
			alive = false;
			api.current = null;
			mounted?.destroy();
			report(false);
		};
	}, [gpu, reduce, lean, rise]);

	useEffect(() => {
		api.current?.set(look);
	}, [look]);
	useEffect(() => {
		api.current?.setFloor(floorY);
	}, [floorY]);

	// ---- grain: off under reduced motion; paused while the scene is off screen ----
	const grainOn = !reduce && look.grain > 0;
	useEffect(() => {
		if (!grainOn) {
			setTile(null);
			return;
		}
		const url = grainTile();
		const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
		// One noise pixel per device pixel (to DPR 2): fine, never blotchy.
		setTile(url ? { url, size: Math.round(TILE / dpr) } : null);
	}, [grainOn]);
	useEffect(() => {
		const el = rootRef.current;
		if (!el || !grainOn || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => {
			if (e?.isIntersecting) delete el.dataset.off;
			else el.dataset.off = "";
		});
		io.observe(el);
		return () => io.disconnect();
	}, [grainOn]);

	// Warm highlights: soft-light with a warm near-grey leaves black black and white white and
	// tips the mids and highs toward gilt (the cool umber shadow lift is in the shader layer).
	const g = look.grade;
	const [tr, tg, tb] = BASE.warm.map((c) =>
		Math.round(255 * clamp(0.5 + (c - 0.5) * g, 0, 1)),
	);
	const vars = {
		"--fx-vig": clamp(look.vignette * BASE.vignette, 0, 0.95).toFixed(3),
		"--fx-vault": clamp(look.haze * BASE.vault, 0, 0.95).toFixed(3),
		"--fx-tint": `rgb(${tr} ${tg} ${tb})`,
		"--fx-grain": clamp(look.grain * BASE.grain, 0, 0.5).toFixed(3),
	} as CSSProperties;

	const off = Object.values(look).every((v) => v <= 0);
	if (off) return null;
	return (
		<div
			ref={rootRef}
			className={className ? `${s.atmosphere} ${className}` : s.atmosphere}
			style={style ? { ...vars, ...style } : vars}
			aria-hidden="true"
		>
			{gpu && <canvas ref={canvasRef} className={s.light} />}
			{opaque && g > 0 && <div className={s.tint} />}
			<div className={s.shade} />
			{tile && (
				<div
					className={s.grain}
					style={{
						backgroundImage: `url(${tile.url})`,
						backgroundSize: `${tile.size}px ${tile.size}px`,
					}}
				/>
			)}
		</div>
	);
}
