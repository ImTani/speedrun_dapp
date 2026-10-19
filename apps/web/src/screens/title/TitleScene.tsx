"use client";

/**
 * The lit nave behind the title: ink stone drawn once to an image, the shader
 * stained-glass window (glassgl, owner-locked preset) with its light pooling on
 * the stone, light shafts, two sill candles and dust turning in the beams.
 *
 * Layout: the 390 x 844 composition is contain-fitted and centred, and the stone
 * is drawn on past it to every edge of the screen, so nothing letterboxes.
 */
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GlassApi } from "@/scene/glassgl";
import { svgURL } from "./ink";
import {
	type Bleed,
	FLOOR_Y,
	naveBox,
	naveSVG,
	STAGE_H,
	STAGE_W,
	WIN,
	WIN_BOT,
	WIN_H,
} from "./nave";
import s from "./title.module.css";

type Layout = {
	w: number;
	h: number;
	scale: number;
	left: number;
	top: number;
	bleed: Bleed;
};

function measure(el: HTMLElement): Layout {
	const w = el.clientWidth || STAGE_W;
	const h = el.clientHeight || STAGE_H;
	const scale = Math.min(w / STAGE_W, h / STAGE_H);
	const left = (w - STAGE_W * scale) / 2;
	// Spare height goes mostly below the window (more floor under the title).
	const top = (h - STAGE_H * scale) * 0.3;
	const step = 40;
	const bx = Math.ceil((left / scale + 24) / step) * step;
	const byTop = top / scale + 24;
	const byBot = (h - top - STAGE_H * scale) / scale + 24;
	const by = Math.ceil(Math.max(byTop, byBot) / step) * step;
	return { w, h, scale, left, top, bleed: { x: bx, y: by } };
}

/** Deterministic dust: [x, y, r, drift seconds, delay]. */
const MOTES = Array.from({ length: 18 }, (_, i) => {
	const a = Math.sin(i * 91.7) * 43758.5453;
	const b = Math.sin(i * 12.9) * 24634.6345;
	const fa = a - Math.floor(a);
	const fb = b - Math.floor(b);
	return {
		x: 110 + fa * 170,
		y: WIN_BOT + 20 + fb * 260,
		r: 0.7 + ((fa * 7) % 1) * 1.3,
		dur: 9 + fb * 9,
		delay: -fa * 12,
		sway: (fb - 0.5) * 26,
	};
});

export function TitleScene({
	flare = 0,
	className,
}: {
	/** Change this number to make the window flare (title impact). */
	flare?: number;
	className?: string;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const winRef = useRef<HTMLCanvasElement>(null);
	const causticRef = useRef<HTMLCanvasElement>(null);
	const api = useRef<GlassApi | null>(null);
	const [layout, setLayout] = useState<Layout | null>(null);
	const [art, setArt] = useState<string | null>(null);
	const [lit, setLit] = useState(false);
	const reduce = useReducedMotion();

	// ---- fit the stage; re-measure on resize (debounced) ----
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		let t = 0;
		const fit = () => setLayout(measure(el));
		fit();
		const ro = new ResizeObserver(() => {
			window.clearTimeout(t);
			t = window.setTimeout(fit, 140);
		});
		ro.observe(el);
		return () => {
			window.clearTimeout(t);
			ro.disconnect();
		};
	}, []);

	// The stone only grows (never redrawn smaller), so rotating back is free.
	const [bleed, setBleed] = useState<Bleed | null>(null);
	useEffect(() => {
		if (!layout) return;
		setBleed((b) =>
			b && b.x >= layout.bleed.x && b.y >= layout.bleed.y
				? b
				: {
						x: Math.max(layout.bleed.x, b?.x ?? 0),
						y: Math.max(layout.bleed.y, b?.y ?? 0),
					},
		);
	}, [layout]);
	const nave = useMemo(() => (bleed ? svgURL(naveSVG(bleed)) : null), [bleed]);
	const box = bleed ? naveBox(bleed) : null;

	// ---- the window: SVG art first, then the shader glass over it ----
	const glassKey = layout
		? `${Math.round(layout.w)}x${Math.round(layout.h)}`
		: "";
	useEffect(() => {
		if (!glassKey) return;
		let alive = true;
		let mounted: GlassApi | null = null;
		setLit(false);
		(async () => {
			const { G } = await import("@/scene/glass.js");
			if (!alive) return;
			setArt(G.windowSVG({ theme: WIN.theme, seed: WIN.seed, width: WIN.w }));
			const { GL } = await import("@/scene/glassgl.js");
			const win = winRef.current;
			const caustic = causticRef.current;
			if (!alive || !win || !caustic) return;
			mounted = await GL.mount({
				winCanvas: win,
				causticCanvas: caustic,
				theme: WIN.theme,
				seed: WIN.seed,
				preset: "locked",
				causticBoost: 1.25,
				causticReach: 1.15,
			}).catch(() => null);
			if (!alive) {
				mounted?.destroy();
				return;
			}
			api.current = mounted;
			if (mounted) {
				setLit(true);
				mounted.swell();
			}
		})().catch(() => {
			/* no shader glass: the SVG window stays */
		});
		return () => {
			alive = false;
			api.current = null;
			mounted?.destroy();
		};
	}, [glassKey]);

	useEffect(() => {
		if (flare > 0) api.current?.swell();
	}, [flare]);

	const stageStyle = layout
		? {
				transform: `translate(${layout.left}px, ${layout.top}px) scale(${layout.scale})`,
			}
		: { visibility: "hidden" as const };
	const glassStyle = layout
		? {
				left: layout.left + (WIN.cx - WIN.w / 2) * layout.scale,
				top: layout.top + WIN.top * layout.scale,
				width: WIN.w * layout.scale,
				height: WIN_H * layout.scale,
			}
		: { visibility: "hidden" as const };

	return (
		<div
			ref={rootRef}
			className={className ? `${s.scene} ${className}` : s.scene}
			aria-hidden="true"
		>
			<div className={s.stage} style={stageStyle}>
				{nave && box && (
					// biome-ignore lint/performance/noImgElement: a generated SVG drawing, not a photo
					<motion.img
						key={nave.length}
						className={s.nave}
						src={nave}
						alt=""
						draggable={false}
						style={{
							left: box[0],
							top: box[1],
							width: box[2],
							height: box[3],
						}}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 1.1, ease: "easeOut" }}
					/>
				)}
				<Shafts reduce={!!reduce} />
			</div>

			<motion.canvas
				key={`c${glassKey}`}
				ref={causticRef}
				className={s.caustic}
				initial={{ opacity: 0 }}
				animate={{ opacity: lit ? 1 : 0 }}
				transition={{ duration: 2.2, delay: 0.4 }}
			/>

			<motion.div
				className={s.glass}
				style={glassStyle}
				initial={{ opacity: 0, filter: "brightness(0.25)" }}
				animate={{ opacity: 1, filter: "brightness(1)" }}
				transition={{ duration: 1.8, delay: 0.25, ease: "easeOut" }}
			>
				{art && (
					<div
						className={s.glassArt}
						style={{ opacity: lit ? 0 : 1 }}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated window art
						dangerouslySetInnerHTML={{ __html: art }}
					/>
				)}
				<canvas key={`w${glassKey}`} ref={winRef} className={s.glassGL} />
			</motion.div>

			<div className={s.stage} style={stageStyle}>
				<Candles reduce={!!reduce} />
				{!reduce && <Motes />}
			</div>
		</div>
	);
}

/** Beams from the glass to the floor, breathing slowly. */
function Shafts({ reduce }: { reduce: boolean }) {
	const x0 = WIN.cx - WIN.w / 2;
	const x1 = WIN.cx + WIN.w / 2;
	return (
		<motion.svg
			className={s.overlay}
			viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
			animate={reduce ? {} : { opacity: [0.75, 1, 0.8, 1, 0.75] }}
			transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY }}
		>
			<defs>
				<linearGradient id="ts-shaft" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#f6cf7e" stopOpacity="0.2" />
					<stop offset="0.55" stopColor="#f0a95a" stopOpacity="0.07" />
					<stop offset="1" stopColor="#f0a95a" stopOpacity="0" />
				</linearGradient>
				<radialGradient id="ts-pool" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor="#f2c25a" stopOpacity="0.2" />
					<stop offset="1" stopColor="#f2c25a" stopOpacity="0" />
				</radialGradient>
			</defs>
			<g style={{ mixBlendMode: "screen" }}>
				<polygon
					points={`${x0 + 30},${WIN.top + 120} ${x1 - 40},${WIN.top + 110} ${x1 + 70},${STAGE_H} ${x0 - 20},${STAGE_H}`}
					fill="url(#ts-shaft)"
				/>
				<polygon
					points={`${x0 + 70},${WIN.top + 150} ${x0 + 110},${WIN.top + 150} ${x0 + 150},${STAGE_H} ${x0 + 40},${STAGE_H}`}
					fill="url(#ts-shaft)"
					opacity="0.8"
				/>
				<ellipse
					cx={WIN.cx + 10}
					cy={FLOOR_Y + 150}
					rx="190"
					ry="70"
					fill="url(#ts-pool)"
				/>
			</g>
		</motion.svg>
	);
}

/** Two tapers on the sill, flames that never sit still. */
function Candles({ reduce }: { reduce: boolean }) {
	const at = [WIN.cx - WIN.w / 2 - 6, WIN.cx + WIN.w / 2 + 6];
	const base = WIN_BOT + 2;
	return (
		<svg
			className={s.overlay}
			viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
			aria-hidden="true"
		>
			<defs>
				<radialGradient id="ts-candle" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor="#ffd28a" stopOpacity="0.55" />
					<stop offset="0.4" stopColor="#ff9a4a" stopOpacity="0.18" />
					<stop offset="1" stopColor="#ff6a4a" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="ts-wax" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#6e5c46" />
					<stop offset="0.45" stopColor="#e9dcc0" />
					<stop offset="1" stopColor="#a8916a" />
				</linearGradient>
				<radialGradient id="ts-flame" cx="0.5" cy="0.7" r="0.6">
					<stop offset="0" stopColor="#fff6dc" />
					<stop offset="0.5" stopColor="#ffc46a" />
					<stop offset="1" stopColor="#ff6a2a" />
				</radialGradient>
			</defs>
			{at.map((x, i) => {
				const h = i ? 30 : 38;
				const top = base - h;
				return (
					<g key={x}>
						<motion.circle
							cx={x}
							cy={top - 8}
							r="34"
							fill="url(#ts-candle)"
							style={{ mixBlendMode: "screen" }}
							animate={reduce ? {} : { opacity: [0.8, 1, 0.7, 0.95, 0.8] }}
							transition={{
								duration: 2.6 + i * 0.7,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						/>
						<path
							d={`M${x - 5} ${base} V${top + 2} Q${x - 5} ${top} ${x - 2} ${top} H${x + 3} Q${x + 5} ${top} ${x + 5} ${top + 3} V${base} Z`}
							fill="url(#ts-wax)"
							stroke="#0b0807"
							strokeWidth="1.4"
						/>
						<path
							d={`M${x - 5} ${top + 4} q2 7 0 12 M${x + 5} ${top + 3} q-1.5 5 0 8`}
							fill="none"
							stroke="#f3e6c8"
							strokeWidth="1.6"
							strokeLinecap="round"
							opacity="0.6"
						/>
						<path d={`M${x} ${top} v-4`} stroke="#0b0807" strokeWidth="1.2" />
						<motion.path
							d={`M${x} ${top - 3} C${x - 4} ${top - 7} ${x - 2.5} ${top - 12} ${x} ${top - 17} C${x + 2.5} ${top - 12} ${x + 4} ${top - 7} ${x} ${top - 3} Z`}
							fill="url(#ts-flame)"
							style={{ originX: "50%", originY: "100%" }}
							animate={
								reduce
									? {}
									: {
											scaleY: [1, 1.18, 0.9, 1.1, 1],
											scaleX: [1, 0.9, 1.06, 0.94, 1],
											rotate: [0, -3, 2, -1, 0],
										}
							}
							transition={{
								duration: 1.3 + i * 0.37,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						/>
					</g>
				);
			})}
		</svg>
	);
}

/** Dust turning slowly in the beams. */
function Motes() {
	return (
		<svg
			className={s.overlay}
			viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
			aria-hidden="true"
		>
			{MOTES.map((m) => (
				<motion.circle
					key={`${m.x}-${m.y}`}
					cx={m.x}
					cy={m.y}
					r={m.r}
					fill="#ffe2a8"
					initial={{ opacity: 0 }}
					animate={{
						opacity: [0, 0.75, 0.55, 0],
						y: [0, -60, -110],
						x: [0, m.sway, -m.sway * 0.4],
					}}
					transition={{
						duration: m.dur,
						delay: Math.abs(m.delay),
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
			))}
		</svg>
	);
}
