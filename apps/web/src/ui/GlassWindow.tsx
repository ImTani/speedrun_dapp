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
import { animate, motion, useReducedMotion, useSpring } from "motion/react";
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
import { spring } from "./motion";

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
		// The floor this window lights, as handed to the shader (the ref may be gone at cleanup).
		let floorEl: HTMLCanvasElement | null = null;
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
			floorEl = caustics?.current ?? null;
			api = await GL.mount({
				winCanvas: canvas,
				...(floorEl ? { causticCanvas: floorEl } : {}),
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
			// The lens paints 2D frames: wipe this window's light off the floor it lit.
			floorEl?.getContext("2d")?.clearRect(0, 0, floorEl.width, floorEl.height);
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

// ---------------------------------------------------------------- rose window

/**
 * RoseWindow: a round rose of the Aspect's glass, lit from behind by the same
 * window shader (glassgl.js WINDOW_FRAG on the owner-locked preset): hammered
 * relief, streaky cathedral glass, seeds, bevelled lead, bloom. One WebGL
 * context for its whole life; changing `aspect` dims the light, swaps the
 * panes and lets the light back in. `turn` (degrees) turns the wheel; the
 * light behind it stays put. Without WebGL2 the finished SVG art stands in.
 *
 *   <RoseWindow aspect={2} turn={-30} />
 */
export function RoseWindow({
	aspect,
	turn = 0,
	className,
	style,
}: {
	aspect: number;
	/** Rotation of the glass in degrees (springs to it). */
	turn?: number;
	className?: string;
	style?: CSSProperties;
}) {
	const idx = aspect >= 0 && aspect < 7 ? aspect : 6;
	const tint = (ASPECT_GLASS[idx] ?? ASPECT_GLASS[6])[0];
	const reduce = useReducedMotion() ?? false;
	const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
	const boxRef = useRef<HTMLDivElement>(null);
	const artRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const roseRef = useRef<RoseGL | null>(null);
	const aspectRef = useRef(idx);
	aspectRef.current = idx;
	const rot = useSpring(turn, spring.settle);
	const rotRef = useRef(rot);
	rotRef.current = rot;
	const [lit, setLit] = useState(false);
	const [size, setSize] = useState(0);
	const [gen, setGen] = useState(0);

	useEffect(() => {
		rot.set(turn);
	}, [rot, turn]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: gen is the remount trigger
	useEffect(() => {
		let dead = false;
		let rose: RoseGL | null = null;
		const box = boxRef.current;
		const canvas = canvasRef.current;
		if (!box || !canvas) return;
		const mountedW = box.clientWidth;
		setSize(mountedW);
		setLit(false);
		(async () => {
			if (mountedW < 40) return;
			const [{ GL }, lens] = await Promise.all([
				import("@/scene/glassgl.js"),
				import("@/scene/lens.js"),
			]);
			if (dead) return;
			rose = await mountRose(
				canvas,
				GL as unknown as GLKit,
				lens,
				aspectRef.current,
				() => rotRef.current.get(),
				reduce,
			).catch(() => null);
			if (!rose) return;
			if (dead) {
				rose.destroy();
				return;
			}
			roseRef.current = rose;
			setLit(true);
		})();
		const ro = new ResizeObserver(() => {
			if (Math.abs(box.clientWidth - mountedW) > 12) setGen((g) => g + 1);
		});
		ro.observe(box);
		return () => {
			dead = true;
			ro.disconnect();
			rose?.destroy();
			roseRef.current = null;
		};
	}, [gen, reduce]);

	// The panes follow the Aspect: SVG art always (the fallback), the shader's layers once lit.
	useEffect(() => {
		const artEl = artRef.current;
		if (artEl && size > 0)
			artEl.innerHTML = roseSVG(idx, "art", Math.round(size), `rw${uid}`);
		if (lit) roseRef.current?.show(idx);
	}, [idx, size, uid, lit]);

	return (
		<div
			ref={boxRef}
			className={className}
			style={{
				position: "relative",
				width: "100%",
				aspectRatio: "1",
				isolation: "isolate",
				...style,
			}}
		>
			{/* Light spilling past the stone onto the wall. */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: "-16%",
					zIndex: -1,
					pointerEvents: "none",
					background: `radial-gradient(closest-side, ${tint}55 0%, ${tint}1c 55%, transparent 100%)`,
				}}
			/>
			<motion.div
				aria-hidden="true"
				style={{ position: "absolute", inset: 0, rotate: rot }}
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 200 200"
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
					}}
				>
					<circle cx="100" cy="100" r={ROSE_R} fill="#0b0807" />
				</svg>
				<motion.div
					ref={artRef}
					initial={{ opacity: 0 }}
					animate={{ opacity: size > 0 && !lit ? 1 : 0 }}
					transition={{ duration: lit ? 0.6 : 0.9 }}
					style={{ position: "absolute", inset: 0, lineHeight: 0 }}
				/>
				<motion.canvas
					ref={canvasRef}
					initial={{ opacity: 0 }}
					animate={{ opacity: lit ? 1 : 0 }}
					transition={{ duration: 0.9 }}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
					}}
				/>
			</motion.div>
			<RoseStone />
		</div>
	);
}

// The rose's own drawing space: 200 x 200, centre (100, 100), glass out to ROSE_R.
const ROSE_C = 100;
const ROSE_R = 93;
const LEAD = "#0b0a10";
/** A second colour per Aspect for the roundels and the jewelled band. */
const ROSE_ACCENT = [
	"#176a4f", // Mercy: green against the gold
	"#d9951f", // Hunger: amber in the blood
	"#a3172f", // Echo: ruby in the blue
	"#b8924a", // Rancour: old gold
	"#4e2a7a", // Appetite: violet
	"#a3172f", // Inquisitor: ruby
	"#3fa9b8", // Madness: verdigris
] as const;

function roseRng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function roseJitter(hex: string, r: () => number, amt: number) {
	const n = Number.parseInt(hex.slice(1), 16);
	const k = 1 + (r() - 0.5) * 2 * amt;
	const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
		Math.max(0, Math.min(255, Math.round(v * k))),
	);
	return `rgb(${c.join(",")})`;
}
const rp = (r: number, a: number) =>
	`${(ROSE_C + r * Math.cos(a)).toFixed(2)} ${(ROSE_C + r * Math.sin(a)).toFixed(2)}`;
function rosePiece(r0: number, r1: number, a0: number, a1: number) {
	return r0 === 0
		? `M${ROSE_C} ${ROSE_C} L${rp(r1, a0)} A${r1} ${r1} 0 0 1 ${rp(r1, a1)}Z`
		: `M${rp(r0, a0)} L${rp(r1, a0)} A${r1} ${r1} 0 0 1 ${rp(r1, a1)} L${rp(r0, a1)} A${r0} ${r0} 0 0 0 ${rp(r0, a0)}Z`;
}

/**
 * The rose's panes as an SVG string, in the same modes glass.js uses for the
 * arched windows: "art" (finished, lit), "color" (panes + lead: the shader's
 * albedo), "lead" (white lead on black: the came mask), "glow" (panes only).
 */
function roseSVG(
	aspect: number,
	mode: "art" | "color" | "lead" | "glow",
	width: number,
	id: string,
) {
	const [a, b, c] = ASPECT_GLASS[aspect] ?? ASPECT_GLASS[6];
	const x = ROSE_ACCENT[aspect] ?? ROSE_ACCENT[6];
	const r = roseRng(101 + aspect * 17);
	const shapes: string[] = [];
	const add = (d: string, fill: string) =>
		shapes.push(`<path d="${d}" fill="${fill}"/>`);
	const disc = (cx: number, cy: number, rr: number, fill: string) =>
		shapes.push(
			`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${rr}" fill="${fill}"/>`,
		);
	const P = 12;
	const step = (Math.PI * 2) / P;
	const off = -Math.PI / 2 - step / 2; // a petal stands upright at the top
	// Oculus: the hub behind the mask.
	for (let i = 0; i < 6; i++)
		add(
			rosePiece(0, 22, off + i * step * 2, off + (i + 1) * step * 2),
			roseJitter(i % 2 ? b : x, r, 0.06),
		);
	// Petals, each holding a roundel.
	for (let i = 0; i < P; i++)
		add(
			rosePiece(22, 58, off + i * step, off + (i + 1) * step),
			roseJitter(i % 2 ? c : a, r, 0.12),
		);
	for (let i = 0; i < P; i++) {
		const t = off + (i + 0.5) * step;
		disc(
			ROSE_C + 42 * Math.cos(t),
			ROSE_C + 42 * Math.sin(t),
			7.5,
			roseJitter(i % 2 ? x : b, r, 0.08),
		);
	}
	// The jewelled band.
	for (let i = 0; i < P * 2; i++)
		add(
			rosePiece(58, 65, off + (i * step) / 2, off + ((i + 1) * step) / 2),
			roseJitter(i % 2 ? x : c, r, 0.1),
		);
	// Lancets, two to a petal, checkered petal by petal.
	for (let i = 0; i < P * 2; i++) {
		const k = Math.floor(i / 2);
		add(
			rosePiece(65, ROSE_R, off + (i * step) / 2, off + ((i + 1) * step) / 2),
			roseJitter((i + k) % 2 ? c : a, r, 0.14),
		);
	}
	// Roundels where the lancets meet.
	for (let i = 0; i < P; i++) {
		const t = off + i * step;
		disc(
			ROSE_C + 80 * Math.cos(t),
			ROSE_C + 80 * Math.sin(t),
			6.5,
			roseJitter(i % 2 ? b : x, r, 0.1),
		);
	}
	const all = shapes.join("");
	const ring = `<circle cx="${ROSE_C}" cy="${ROSE_C}" r="${ROSE_R}" fill="none"`;
	const clip = `<clipPath id="${id}c"><circle cx="${ROSE_C}" cy="${ROSE_C}" r="${ROSE_R}"/></clipPath>`;
	let defs = clip;
	let inner: string;
	if (mode === "lead")
		inner = `<rect width="200" height="200" fill="#000"/><g stroke="#fff" stroke-width="2.6" stroke-linejoin="round">${all.replace(/fill="[^"]*"/g, 'fill="#000"')}</g>${ring} stroke="#fff" stroke-width="8"/>`;
	else if (mode === "glow") inner = `<g>${all}</g>`;
	else if (mode === "color")
		inner = `<g stroke="${LEAD}" stroke-width="2.6" stroke-linejoin="round">${all}</g>${ring} stroke="${LEAD}" stroke-width="8"/>`;
	else {
		defs += `<radialGradient id="${id}l" gradientUnits="userSpaceOnUse" cx="100" cy="88" r="110"><stop offset="0" stop-color="#fff" stop-opacity=".46"/><stop offset=".4" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${aspect + 3}"/><feColorMatrix type="saturate" values="0"/></filter>`;
		inner = `<g stroke="${LEAD}" stroke-width="2.6" stroke-linejoin="round">${all}</g><rect width="200" height="200" fill="url(#${id}l)" style="mix-blend-mode:screen"/><rect width="200" height="200" filter="url(#${id}n)" opacity=".18" style="mix-blend-mode:overlay"/>${ring} stroke="${LEAD}" stroke-width="8"/>`;
	}
	const dims =
		mode === "art"
			? `width="100%" height="100%"`
			: `width="${width}" height="${width}"`;
	return `<svg xmlns="http://www.w3.org/2000/svg" ${dims} viewBox="0 0 200 200"><defs>${defs}</defs><g clip-path="url(#${id}c)">${inner}</g></svg>`;
}

/** The stone the rose is set in: moulding, gilt hairline, twelve bosses. */
function RoseStone() {
	const bosses = Array.from({ length: 12 }, (_, i) => {
		const t = (i / 12) * Math.PI * 2 - Math.PI / 2;
		return [100 + 96.2 * Math.cos(t), 100 + 96.2 * Math.sin(t)] as const;
	});
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 200 200"
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				overflow: "visible",
				pointerEvents: "none",
				filter: "drop-shadow(0 8px 14px #000b)",
			}}
		>
			<defs>
				<linearGradient id="rw-stone" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#6e5a44" />
					<stop offset=".35" stopColor="#4a382a" />
					<stop offset=".7" stopColor="#2e2219" />
					<stop offset="1" stopColor="#140d0a" />
				</linearGradient>
			</defs>
			{/* Moulding: an annulus from the glass edge out to the box edge (even-odd). */}
			<path
				fillRule="evenodd"
				fill="url(#rw-stone)"
				stroke="#0b0807"
				strokeWidth="1.6"
				d="M0.5 100 A99.5 99.5 0 1 0 199.5 100 A99.5 99.5 0 1 0 0.5 100 Z M7.5 100 A92.5 92.5 0 1 0 192.5 100 A92.5 92.5 0 1 0 7.5 100 Z"
			/>
			<circle
				cx="100"
				cy="100"
				r="92.5"
				fill="none"
				stroke="#0b0807"
				strokeWidth="3"
			/>
			<circle
				cx="100"
				cy="100"
				r="94.8"
				fill="none"
				stroke="#c9a24f"
				strokeWidth=".9"
				opacity=".7"
			/>
			{bosses.map(([cx, cy]) => (
				<circle
					key={`${cx.toFixed(1)}-${cy.toFixed(1)}`}
					cx={cx}
					cy={cy}
					r="2.2"
					fill="#8a7152"
					stroke="#0b0807"
					strokeWidth="1"
				/>
			))}
		</svg>
	);
}

type GLKit = {
	WINDOW_FRAG: string;
	PRESETS: Record<string, Record<string, number>>;
	raster(
		svg: string,
		w: number,
		h: number,
		blur?: number,
	): Promise<HTMLCanvasElement>;
};
type RoseGL = { show(aspect: number): void; destroy(): void };

type Lens = typeof import("@/scene/lens.js");
const ROSE_UNIFORM = {
	hot: "uHot",
	amb: "uAmb",
	moon: "uMoon",
	leak: "uLeak",
	rim: "uRim",
	grime: "uGrime",
	bloom: "uBloom",
	bloomGlass: "uBloomGlass",
	streak: "uStreak",
	relief: "uRelief",
	expo: "uExpo",
} as const;
const ROSE_LAYERS = ["uCol", "uLead", "uLeadBlur", "uGlow"] as const;

/**
 * Light the rose with the arched windows' shader, drawn through the shared lens (one WebGL
 * context for the whole app; this canvas takes 2D frames). The lens clock gives about 30 frames
 * a second: the light drifts slowly; the phone stays cool.
 */
async function mountRose(
	canvas: HTMLCanvasElement,
	GL: GLKit,
	lens: Lens,
	first: number,
	angle: () => number,
	reduce: boolean,
): Promise<RoseGL | null> {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const W = Math.round(canvas.clientWidth * dpr);
	if (W < 40) return null;
	if (!lens.lensReady(GL.WINDOW_FRAG) || !canvas.getContext("2d")) return null;
	canvas.width = W;
	canvas.height = W;
	const params: Record<string, number> = { ...(GL.PRESETS.locked ?? {}) };
	const layers = (asp: number) =>
		Promise.all([
			GL.raster(roseSVG(asp, "color", W, "rc"), W, W),
			GL.raster(roseSVG(asp, "lead", W, "rl"), W, W),
			GL.raster(roseSVG(asp, "lead", W, "rb"), W, W, 2.2 * dpr),
			GL.raster(roseSVG(asp, "glow", W >> 2, "rg"), W >> 2, W >> 2, 1.8 * dpr),
		]);
	// The layers on the glass now, kept so a rebuilt context can take them again.
	let src = await layers(first);
	let fresh = false; // src changed since the last upload
	let tex: WebGLTexture[] = [];

	let current = first;
	let token = 0;
	let dim = reduce ? 0 : 0.6;
	let dimTarget = 0;
	let swellT = -9;
	let prev = 0;
	let dead = false;
	const t0 = performance.now();

	const view = lens.addView({
		targets: [canvas],
		live: !reduce,
		setup(_gl, texture) {
			tex = src.map(texture);
			fresh = false;
		},
		draw(gl, now, pass) {
			if (fresh) {
				src.forEach((c, i) => {
					tex[i] = lens.upload(gl, tex[i] ?? null, c);
				});
				fresh = false;
			}
			const t = (now - t0) / 1000;
			const dt = prev ? Math.min(0.25, (now - prev) / 1000) : 1 / 30;
			prev = now;
			// The light sits just above the hub (behind the mask) and wanders a little.
			// It belongs to the sky, not the glass: it stays put while the wheel turns.
			const wx = reduce ? 0 : Math.sin(t * 0.23) * 0.07;
			const wy = (reduce ? 0 : Math.sin(t * 0.17) * 0.05) - 0.05;
			const th = (-angle() * Math.PI) / 180;
			const lx = wx * Math.cos(th) - wy * Math.sin(th);
			const ly = wx * Math.sin(th) + wy * Math.cos(th);
			dim = reduce ? dimTarget : lens.ease(dim, dimTarget, 0.14, dt);
			const sw =
				Math.max(0, 1 - (t - swellT) / 1.1) * Math.min(1, (t - swellT) * 6);
			pass(canvas, () => {
				const p = lens.program(gl, GL.WINDOW_FRAG);
				const U = (n: string) => lens.uniform(gl, p, n);
				gl.useProgram(p);
				lens.bind(gl, tex);
				ROSE_LAYERS.forEach((n, i) => {
					gl.uniform1i(U(n), i);
				});
				gl.uniform2f(U("uRes"), W, W);
				gl.uniform2f(U("uL"), 0.5 + lx, 0.5 + ly);
				gl.uniform1f(U("uT"), t);
				gl.uniform1f(U("uSwell"), sw * 0.6);
				gl.uniform1f(U("uDim"), dim);
				gl.uniform1f(U("uRed"), 0);
				gl.uniform1f(U("uCrack"), 0);
				gl.uniform3f(U("uCloud"), -9, 0, 0.08);
				for (const [k, u] of Object.entries(ROSE_UNIFORM))
					gl.uniform1f(U(u), params[k] ?? 0);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			});
		},
	});

	return {
		show(next) {
			if (dead || next === current) return;
			current = next;
			const my = ++token;
			dimTarget = 0.92;
			const started = performance.now();
			layers(next)
				.then((c) => {
					const wait = Math.max(0, 150 - (performance.now() - started));
					setTimeout(() => {
						if (dead || my !== token) return;
						src = c;
						fresh = true;
						dimTarget = 0;
						swellT = (performance.now() - t0) / 1000;
						view.invalidate();
					}, wait);
				})
				.catch(() => {});
		},
		destroy() {
			dead = true;
			view.remove();
		},
	};
}
