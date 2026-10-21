"use client";

/**
 * What every hero direction shares: the name, the pitch, Play with its short line, the QR card
 * (desktop), the cue down to "How it plays", and the scene kit (box measuring, the ink nave as
 * an <img>, pointer + scroll parallax, hand-drawn shafts and dust for when the shader light
 * is not running).
 */
import {
	type MotionValue,
	motion,
	useMotionValue,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
} from "motion/react";
import { type RefObject, useEffect, useMemo, useState } from "react";
import { landing as L } from "@/lexicon/landing";
import { svgURL } from "@/screens/title/ink";
import { PrimaryLink } from "@/ui/button";
import link from "@/ui/controls/link.module.css";
import { Wordmark } from "@/ui/wordmark";
import s from "../landing.module.css";
import { QrCode } from "../QrCode";
import { PLAY_URL, PLAY_URL_SHORT } from "../site";
import h from "./hero.module.css";
import { heroNaveSVG, type NaveSpec } from "./ink";

const cx = (...c: (string | false | null | undefined)[]) =>
	c.filter(Boolean).join(" ");

// ---------------------------------------------------------------- words

/** The name, struck. The page's only h1. */
export function HeroMark({ className }: { className?: string | undefined }) {
	return (
		<h1 className={cx(h.mark, className)}>
			<Wordmark sheen />
		</h1>
	);
}

export function HeroPitch({ className }: { className?: string | undefined }) {
	return <p className={cx(h.pitch, className)}>{L.hero.line}</p>;
}

/** Play, and the short line under it. */
export function HeroPlay({ className }: { className?: string | undefined }) {
	return (
		<div className={cx(h.play, className)}>
			<PrimaryLink href="/play" hero legacy={s.play} className={s.playFit}>
				{L.hero.play}
			</PrimaryLink>
			<p className={h.free}>{L.hero.free}</p>
		</div>
	);
}

/** Desktop only: the QR card, so a visitor on a computer can carry the game to a phone. */
export function HeroQr({ className }: { className?: string | undefined }) {
	return (
		<div className={cx(h.qr, className)}>
			<QrCode value={PLAY_URL} size={96} className={s.qrCode} />
			<p className={h.qrText}>
				{L.hero.qr}
				<a href={PLAY_URL} className={`${link.inline} ${s.qrUrl}`}>
					{PLAY_URL_SHORT}
				</a>
			</p>
		</div>
	);
}

/** The cue down to "How it plays" (its heading carries id how-h). */
export function HeroScroll({ className }: { className?: string | undefined }) {
	return (
		<a href="#how-h" className={cx(h.scroll, className)}>
			<span>{L.hero.scroll}</span>
			<svg
				className={h.chevron}
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
			>
				<path
					d="M5 9 L12 16 L19 9"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</a>
	);
}

// ---------------------------------------------------------------- scene kit

export type Box = { w: number; h: number };

/** The element's size, measured now and again after resizes (debounced; whole px). */
export function useBox(ref: RefObject<HTMLElement | null>): Box | null {
	const [box, setBox] = useState<Box | null>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		let t = 0;
		const fit = () => {
			const w = Math.round(el.clientWidth);
			const hh = Math.round(el.clientHeight);
			if (w < 10 || hh < 10) return;
			setBox((b) => (b && b.w === w && b.h === hh ? b : { w, h: hh }));
		};
		fit();
		const ro = new ResizeObserver(() => {
			window.clearTimeout(t);
			t = window.setTimeout(fit, 160);
		});
		ro.observe(el);
		return () => {
			window.clearTimeout(t);
			ro.disconnect();
		};
	}, [ref]);
	return box;
}

/** The ink nave for a spec, as an image URL (redrawn only when the spec changes). */
export function useNave(spec: NaveSpec | null): string | null {
	const key = spec ? JSON.stringify(spec) : "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: key stands for the spec
	return useMemo(() => (spec ? svgURL(heroNaveSVG(spec)) : null), [key]);
}

/** The ink nave, fading in once drawn. */
export function NaveImage({ src, box }: { src: string | null; box: Box }) {
	if (!src) return null;
	return (
		// biome-ignore lint/performance/noImgElement: a generated SVG drawing, not a photo
		<motion.img
			key={src.length}
			className={h.nave}
			src={src}
			alt=""
			draggable={false}
			style={{ width: box.w, height: box.h }}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1.1, ease: "easeOut" }}
		/>
	);
}

export type Parallax = {
	/** Pointer, eased: -1..1 across the screen. */
	px: MotionValue<number>;
	py: MotionValue<number>;
	/** Page scroll in px (0 under reduced motion). */
	scroll: MotionValue<number>;
	reduce: boolean;
};

/** Pointer (fine pointers only) and scroll, eased, for slow parallax. Still under reduced motion. */
export function useParallax(): Parallax {
	const reduce = useReducedMotion() ?? false;
	const rx = useMotionValue(0);
	const ry = useMotionValue(0);
	const px = useSpring(rx, { stiffness: 30, damping: 16, mass: 1 });
	const py = useSpring(ry, { stiffness: 30, damping: 16, mass: 1 });
	const { scrollY } = useScroll();
	const still = useMotionValue(0);
	const scroll = reduce ? still : scrollY;
	useEffect(() => {
		if (reduce) {
			rx.set(0);
			ry.set(0);
			return;
		}
		if (!window.matchMedia("(pointer: fine)").matches) return;
		let raf = 0;
		let lx = 0;
		let ly = 0;
		const move = (e: PointerEvent) => {
			lx = (e.clientX / window.innerWidth) * 2 - 1;
			ly = (e.clientY / window.innerHeight) * 2 - 1;
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				rx.set(lx);
				ry.set(ly);
			});
		};
		window.addEventListener("pointermove", move, { passive: true });
		return () => {
			window.removeEventListener("pointermove", move);
			cancelAnimationFrame(raf);
		};
	}, [reduce, rx, ry]);
	return { px, py, scroll, reduce };
}

/**
 * A layer's offset: `depth` px of travel across the pointer's range, and `lag` of the
 * scroll (0.3 = the layer falls behind the page by 30%, so it seems further away).
 */
export function useLayer(p: Parallax, depth: number, lag = 0) {
	const x = useTransform(p.px, (v) => -v * depth);
	const y = useTransform(
		[p.py, p.scroll],
		([a, b]) => -(a as number) * depth * 0.6 + (b as number) * lag,
	);
	return { x, y };
}

/** Beams from glass down to the floor, breathing (hand-drawn: retired when the shader light runs). */
export function Shafts({
	box,
	from,
	floor,
	reduce,
	tint = "#f6cf7e",
}: {
	box: Box;
	/** Each beam's top edge: [left x, right x, y] in box px. */
	from: readonly (readonly [number, number, number])[];
	floor: number;
	reduce: boolean;
	tint?: string;
}) {
	const id = `hs${Math.round(box.w)}`;
	const lean = box.w * 0.04;
	return (
		<motion.svg
			className={h.overlay}
			viewBox={`0 0 ${box.w} ${box.h}`}
			aria-hidden="true"
			animate={reduce ? {} : { opacity: [0.75, 1, 0.8, 1, 0.75] }}
			transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY }}
		>
			<defs>
				<linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={tint} stopOpacity="0.2" />
					<stop offset="0.55" stopColor="#f0a95a" stopOpacity="0.07" />
					<stop offset="1" stopColor="#f0a95a" stopOpacity="0" />
				</linearGradient>
				<radialGradient id={`${id}p`} cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor="#f2c25a" stopOpacity="0.2" />
					<stop offset="1" stopColor="#f2c25a" stopOpacity="0" />
				</radialGradient>
			</defs>
			<g style={{ mixBlendMode: "screen" }}>
				{from.map(([x0, x1, y]) => {
					const spread = (x1 - x0) * 0.35;
					return (
						<g key={`${x0}-${y}`}>
							<polygon
								points={`${x0 + (x1 - x0) * 0.12},${y} ${x1 - (x1 - x0) * 0.12},${y} ${x1 + spread + lean},${box.h} ${x0 - spread * 0.4 + lean},${box.h}`}
								fill={`url(#${id}s)`}
							/>
							<ellipse
								cx={(x0 + x1) / 2 + lean * 0.6}
								cy={floor + (box.h - floor) * 0.35}
								rx={(x1 - x0) * 0.9}
								ry={(box.h - floor) * 0.2}
								fill={`url(#${id}p)`}
							/>
						</g>
					);
				})}
			</g>
		</motion.svg>
	);
}

/** Deterministic dust: [x, y] as fractions of a region, radius, drift seconds, delay, sway. */
function motes(n: number, seed: number) {
	return Array.from({ length: n }, (_, i) => {
		const a = Math.sin((i + seed) * 91.7) * 43758.5453;
		const b = Math.sin((i + seed) * 12.9) * 24634.6345;
		const fa = a - Math.floor(a);
		const fb = b - Math.floor(b);
		return {
			fx: fa,
			fy: fb,
			r: 0.8 + ((fa * 7) % 1) * 1.5,
			dur: 9 + fb * 9,
			delay: fa * 12,
			sway: (fb - 0.5) * 30,
		};
	});
}

/** Dust turning slowly in the beams, inside `region` ([x, y, w, h] in box px). */
export function Motes({
	box,
	region,
	n = 22,
	seed = 3,
}: {
	box: Box;
	region: readonly [number, number, number, number];
	n?: number;
	seed?: number;
}) {
	const list = useMemo(() => motes(n, seed), [n, seed]);
	const [x0, y0, rw, rh] = region;
	return (
		<svg
			className={h.overlay}
			viewBox={`0 0 ${box.w} ${box.h}`}
			aria-hidden="true"
		>
			{list.map((m) => (
				<motion.circle
					key={`${m.fx}-${m.fy}`}
					cx={x0 + m.fx * rw}
					cy={y0 + m.fy * rh}
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
						delay: m.delay,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
			))}
		</svg>
	);
}

/** True once the page is on screen and visible (loops pause when it is not). */
export function useOnScreen(ref: RefObject<HTMLElement | null>): boolean {
	const [seen, setSeen] = useState(true);
	const [shown, setShown] = useState(true);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver(([e]) => setSeen(!!e?.isIntersecting));
		io.observe(el);
		const vis = () => setShown(document.visibilityState === "visible");
		vis();
		document.addEventListener("visibilitychange", vis);
		return () => {
			io.disconnect();
			document.removeEventListener("visibilitychange", vis);
		};
	}, [ref]);
	return seen && shown;
}
