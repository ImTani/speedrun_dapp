"use client";

/**
 * GlassWindow: a Fragment's arched stained-glass window, lit from behind.
 *
 * The glass is the approved baseline (src/scene/glass.js art, lit by the
 * glassgl.js shader on its owner-locked preset). Where WebGL2 is missing the
 * finished SVG art stands in. The Aspect's mask is painted onto the hooded
 * figure in brown grisaille, with ember eyes burning through it.
 *
 *   <GlassWindow aspect={2} width={240} mood="lit" caustics={floorRef} />
 *
 * Moods: lit (bound), waiting (cold glass, awaiting a seal), stirring (light
 * breathing behind the glass), dark (nothing behind it), broken (cracked).
 * Change `swell` to make the light surge once (a reward beat).
 */
import { animate, motion, useReducedMotion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { L } from "@/lexicon";
import type { GlassApi } from "@/scene/glassgl.js";
import { MASK } from "@/scene/masks.js";
import { Mask } from "./Mask";

// Each Aspect's glass tint (the glass is the only saturated colour in the world).
export const ASPECT_GLASS = [
	["#e8c46a", "#f3e6c8", "#c9a24e"],
	["#8e1218", "#c7262c", "#4a0a0e"],
	["#2c5fa8", "#c9ccd4", "#1d3f8f"],
	["#6b3b2a", "#a3172f", "#3a1f15"],
	["#176a4f", "#d9951f", "#a3172f"],
	["#1d3f8f", "#e2d6bf", "#2b6f6a"],
	["#5b2a7a", "#d9951f", "#176a4f"],
] as const;

/** Which window art each Aspect's Fragment stands in (glass.js themes; seed varies the leading). */
export const ASPECT_WINDOW = [
	{ theme: "vibora", seed: 5 }, // Mercy: gold sun, green mantle
	{ theme: "marrow", seed: 3 }, // Hunger: blood sky
	{ theme: "vesper", seed: 7 }, // Echo: the baseline window
	{ theme: "marrow", seed: 19 }, // Rancour: blood sky, other cut
	{ theme: "vibora", seed: 23 }, // Appetite: harlequin green and gold
	{ theme: "hermit", seed: 13 }, // Inquisitor: silver and night blue
	{ theme: "static", seed: 11 }, // Madness: violet and verdigris
] as const;

export type WindowMood = "lit" | "waiting" | "stirring" | "dark" | "broken";

export interface GlassWindowProps {
	aspect: number;
	/** Width in px (height follows the 300:420 arch). Omit to fill the parent's width. */
	width?: number;
	/** Older sizing: height in px; width follows. */
	height?: number;
	mood?: WindowMood;
	/** Older flag: same as mood "dark". */
	dim?: boolean;
	/** Paint the Aspect's mask onto the glass (default true). */
	mask?: boolean;
	/** Light the glass with the WebGL shader (default true). Off = finished SVG art. */
	shader?: boolean;
	/** A canvas (screen-blended, covering the floor below) to pool the window's light onto. */
	caustics?: RefObject<HTMLCanvasElement | null>;
	/** Change this number to make the light surge once. */
	swell?: number;
	/** Called once the glass has its art (lit or not): safe to play a beat over it. */
	onReady?: () => void;
	/** Drawn over the face of the figure. */
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
}

// Face of the hooded figure in the 300 x 420 window art (glass.js windowSVG).
const FACE_Y = 244 / 420;
const MASK_W = 0.36; // of the window width
const MASK_H = (MASK_W * 0.84) / 1.4; // of the window height (mask space is 100 x 84)

const ART_FILTER: Record<WindowMood, string> = {
	lit: "none",
	waiting: "saturate(.5) brightness(.62)",
	stirring: "saturate(.4) brightness(.5)",
	dark: "grayscale(.75) brightness(.38)",
	broken: "grayscale(.5) sepia(.35) brightness(.48)",
};
const MASK_OPACITY: Record<WindowMood, number> = {
	lit: 0.92,
	waiting: 0.85,
	stirring: 0.55,
	dark: 0.5,
	broken: 0.8,
};
const HALO: Record<WindowMood, number> = {
	lit: 0.6,
	waiting: 0.22,
	stirring: 0.3,
	dark: 0.06,
	broken: 0.14,
};
const EYES_ON: Record<WindowMood, number> = {
	lit: 1,
	waiting: 0.5,
	stirring: 0.35,
	dark: 0,
	broken: 0.75,
};

function applyMood(api: GlassApi, mood: WindowMood) {
	api.dim(
		mood === "lit"
			? 0
			: mood === "waiting"
				? 0.55
				: mood === "stirring"
					? 0.7
					: mood === "broken"
						? 0.55
						: 0.92,
	);
	api.red(mood === "broken" ? 0.45 : 0);
	api.crack(mood === "broken" ? 1 : 0);
}

export function GlassWindow({
	aspect,
	width,
	height,
	mood: moodProp,
	dim = false,
	mask = true,
	shader = true,
	caustics,
	swell,
	onReady,
	children,
	className,
	style,
}: GlassWindowProps) {
	const mood: WindowMood = moodProp ?? (dim ? "dark" : "lit");
	const idx = aspect >= 0 && aspect < 7 ? aspect : 6;
	const win = ASPECT_WINDOW[idx] ?? ASPECT_WINDOW[6];
	const tint = (ASPECT_GLASS[idx] ?? ASPECT_GLASS[6])[0];
	const key = (L.aspects[idx] ?? L.aspects[6]).key;
	const reduce = useReducedMotion() ?? false;
	const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

	const boxRef = useRef<HTMLDivElement>(null);
	const artRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const apiRef = useRef<GlassApi | null>(null);
	const moodRef = useRef(mood);
	moodRef.current = mood;
	const readyRef = useRef(onReady);
	readyRef.current = onReady;
	const [lit, setLit] = useState(false); // the shader is running
	const [art, setArt] = useState(false); // the SVG art is in
	const [gen, setGen] = useState(0); // remount after a real resize
	const [boxW, setBoxW] = useState(0); // measured width, sizes the painted mask

	// Paint the art, then light it with the shader. Client only: both modules touch window.
	// biome-ignore lint/correctness/useExhaustiveDependencies: gen is the remount trigger
	useEffect(() => {
		let dead = false;
		let api: GlassApi | null = null;
		const box = boxRef.current;
		const artEl = artRef.current;
		const canvas = canvasRef.current;
		if (!box || !artEl || !canvas) return;
		const mountedW = box.clientWidth;
		setBoxW(mountedW);
		setLit(false);

		(async () => {
			const [{ G }, { GL }] = await Promise.all([
				import("@/scene/glass.js"),
				import("@/scene/glassgl.js"),
			]);
			if (dead) return;
			const svg = G.windowSVG({
				theme: win.theme,
				seed: win.seed,
				width: Math.max(60, Math.round(mountedW)),
				id: `gw${uid}`,
			} as Parameters<typeof G.windowSVG>[0]).replace(
				/<svg([^>]*?) width="\d+" height="\d+"/,
				'<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid slice"',
			);
			artEl.innerHTML = svg;
			setArt(true);
			readyRef.current?.();
			if (!shader || mountedW < 40) return;
			api = await GL.mount({
				winCanvas: canvas,
				...(caustics?.current ? { causticCanvas: caustics.current } : {}),
				theme: win.theme,
				seed: win.seed,
				preset: "locked",
			}).catch(() => null);
			if (!api) return;
			if (dead) {
				api.destroy();
				return;
			}
			apiRef.current = api;
			applyMood(api, moodRef.current);
			setLit(true);
		})();

		// Remount when the window is resized for real (rotation, column change).
		const ro = new ResizeObserver(() => {
			if (Math.abs(box.clientWidth - mountedW) > 12) setGen((g) => g + 1);
		});
		ro.observe(box);

		return () => {
			dead = true;
			ro.disconnect();
			api?.destroy();
			apiRef.current = null;
			const c = caustics?.current;
			c?.getContext("webgl2")?.clear(0x4000);
		};
	}, [win.theme, win.seed, shader, gen, uid]);

	// Mood: the shader eases toward it; "stirring" breathes.
	useEffect(() => {
		const api = apiRef.current;
		if (!api || !lit) return;
		applyMood(api, mood);
		if (mood !== "stirring" || reduce) return;
		let up = false;
		const t = setInterval(() => {
			up = !up;
			api.dim(up ? 0.42 : 0.82);
		}, 2600);
		return () => clearInterval(t);
	}, [mood, lit, reduce]);

	// Swell: the light surges once.
	const haloRef = useRef<HTMLDivElement>(null);
	const firstSwell = useRef(swell);
	useEffect(() => {
		if (swell === undefined || swell === firstSwell.current) return;
		apiRef.current?.swell();
		const el = haloRef.current;
		if (el && !reduce)
			animate(
				el,
				{ opacity: [HALO[moodRef.current], 1, HALO[moodRef.current]] },
				{ duration: 1.3, ease: "easeOut" },
			);
	}, [swell, reduce]);

	const eyes = MASK.EYES[key as keyof typeof MASK.EYES] ?? [];
	const boxStyle: CSSProperties = {
		position: "relative",
		width: width ?? (height ? (height * 300) / 420 : "100%"),
		maxWidth: "100%",
		aspectRatio: "300 / 420",
		isolation: "isolate",
		...style,
	};

	return (
		<div ref={boxRef} className={className} style={boxStyle}>
			{/* Light spilling past the stone onto the wall. */}
			<motion.div
				ref={haloRef}
				aria-hidden="true"
				initial={false}
				animate={{ opacity: art ? HALO[mood] : 0 }}
				transition={{ duration: 1.2 }}
				style={{
					position: "absolute",
					inset: "-22% -30% -8%",
					zIndex: -1,
					pointerEvents: "none",
					background: `radial-gradient(50% 46% at 50% 42%, ${tint}88 0%, ${tint}22 45%, transparent 72%)`,
					filter: "blur(10px)",
				}}
			/>
			<Surround />
			{/* The glass: SVG art first, the shader over it once lit. */}
			<div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
				{/* Unlit glass: the dark of the arch before the art comes in. */}
				<svg
					aria-hidden="true"
					viewBox="0 0 300 420"
					preserveAspectRatio="none"
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
					}}
				>
					<path d="M0 420 V150 A150 150 0 0 1 300 150 V420 Z" fill="#0b0807" />
				</svg>
				<motion.div
					ref={artRef}
					initial={{ opacity: 0 }}
					animate={{ opacity: art && !lit ? 1 : 0 }}
					transition={{ duration: lit ? 0.6 : 1.1 }}
					style={{
						position: "absolute",
						inset: 0,
						filter: ART_FILTER[mood],
						transition: "filter 1.2s",
					}}
				/>
				<motion.canvas
					ref={canvasRef}
					initial={{ opacity: 0 }}
					animate={{ opacity: lit ? 1 : 0 }}
					transition={{ duration: 1.1 }}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						touchAction: "pan-y",
						cursor: "grab",
					}}
				/>
			</div>
			{mask && boxW > 0 ? (
				<>
					<motion.div
						aria-hidden="true"
						initial={false}
						animate={{ opacity: art ? MASK_OPACITY[mood] : 0 }}
						transition={{ duration: 1 }}
						style={{
							position: "absolute",
							left: `${(1 - MASK_W) * 50}%`,
							top: `${(FACE_Y - MASK_H / 2 - 0.012) * 100}%`,
							width: `${MASK_W * 100}%`,
							// Painted onto the glass in grisaille; drawn over the lead, not
							// multiplied into it, so the mask reads on dark hoods too.
							pointerEvents: "none",
							lineHeight: 0,
						}}
					>
						<Mask
							aspect={idx}
							variant="grisaille"
							fit="space"
							shadow={false}
							size={Math.round(boxW * MASK_W)}
						/>
					</motion.div>
					<motion.svg
						aria-hidden="true"
						viewBox="0 0 100 84"
						initial={false}
						animate={{
							opacity: art
								? reduce || EYES_ON[mood] === 0
									? EYES_ON[mood]
									: [
											EYES_ON[mood] * 0.8,
											EYES_ON[mood],
											EYES_ON[mood] * 0.7,
											EYES_ON[mood] * 0.95,
										]
								: 0,
						}}
						transition={
							reduce
								? { duration: 0.6 }
								: {
										duration: 3.2,
										repeat: Number.POSITIVE_INFINITY,
										repeatType: "mirror",
										ease: "easeInOut",
									}
						}
						style={{
							position: "absolute",
							left: `${(1 - MASK_W) * 50}%`,
							top: `${(FACE_Y - MASK_H / 2 - 0.012) * 100}%`,
							width: `${MASK_W * 100}%`,
							overflow: "visible",
							mixBlendMode: "screen",
							pointerEvents: "none",
						}}
					>
						<defs>
							<radialGradient id={`gwe${uid}`}>
								<stop offset="0" stopColor="#fff3c4" />
								<stop offset=".22" stopColor="#ffb27a" />
								<stop offset=".5" stopColor="#ff6a4a" stopOpacity=".75" />
								<stop offset="1" stopColor="#7a1c0e" stopOpacity="0" />
							</radialGradient>
						</defs>
						{eyes.map(([x, y]) => (
							<circle
								key={`${x}-${y}`}
								cx={x}
								cy={y}
								r={7.5}
								fill={`url(#gwe${uid})`}
							/>
						))}
					</motion.svg>
				</>
			) : null}
			{children ? (
				<div
					style={{
						position: "absolute",
						left: "50%",
						top: `${FACE_Y * 100}%`,
						transform: "translate(-50%, -50%)",
						lineHeight: 0,
					}}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

/**
 * The stone surround and sill, and the arch clip the glass is cut to. Drawn in the
 * window's own 300 x 420 space, overhanging it on every side.
 */
function Surround() {
	return (
		<svg
			aria-hidden="true"
			viewBox="-26 -24 352 476"
			style={{
				position: "absolute",
				left: "-8.667%",
				top: "-5.714%",
				width: "117.333%",
				height: "113.333%",
				maxWidth: "none",
				overflow: "visible",
				pointerEvents: "none",
				zIndex: 2,
			}}
		>
			<defs>
				<linearGradient id="gw-stone" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#1a120d" />
					<stop offset=".18" stopColor="#4a382a" />
					<stop offset=".5" stopColor="#5a4632" />
					<stop offset=".82" stopColor="#3a2c22" />
					<stop offset="1" stopColor="#140d0a" />
				</linearGradient>
				<linearGradient id="gw-sill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#6e5a44" />
					<stop offset=".35" stopColor="#3a2c22" />
					<stop offset="1" stopColor="#120c0a" />
				</linearGradient>
			</defs>
			{/* Moulding: outer arch with the window cut out (even-odd). */}
			<path
				fillRule="evenodd"
				fill="url(#gw-stone)"
				stroke="#0b0807"
				strokeWidth="3"
				d="M-18 424 V150 A168 168 0 0 1 318 150 V424 Z M0 420 V150 A150 150 0 0 1 300 150 V420 Z"
			/>
			{/* Inner chamfer and gilt hairline. */}
			<path
				d="M-8 424 V150 A158 158 0 0 1 308 150 V424"
				fill="none"
				stroke="#0b0807"
				strokeWidth="2"
				opacity=".7"
			/>
			<path
				d="M0 420 V150 A150 150 0 0 1 300 150 V420"
				fill="none"
				stroke="#0b0807"
				strokeWidth="9"
			/>
			<path
				d="M5 420 V150 A145 145 0 0 1 295 150 V420"
				fill="none"
				stroke="#c9a24f"
				strokeWidth="1.6"
				opacity=".75"
			/>
			{/* Keystone. */}
			<path
				d="M138 -16 L162 -16 L157 6 L143 6 Z"
				fill="#5a4632"
				stroke="#0b0807"
				strokeWidth="2.5"
			/>
			{/* Sill. */}
			<path
				d="M-26 420 H326 L320 444 H-20 Z"
				fill="url(#gw-sill)"
				stroke="#0b0807"
				strokeWidth="3"
				strokeLinejoin="round"
			/>
			<path d="M-22 424 H322" stroke="#a8916a" strokeWidth="1" opacity=".5" />
		</svg>
	);
}
