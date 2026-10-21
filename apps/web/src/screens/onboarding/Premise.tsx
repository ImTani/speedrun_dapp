"use client";

/**
 * The premise, before the first mask: three full-screen beats, each a picture drawn in code and
 * a line or two of plain words.
 *   I   the glass      a god devoured itself; its light lies shattered in the window
 *   II  the masks      you bind a piece of it and choose its mask (the masks turn in a ring)
 *   III the duel       it plays for Light on its own (two masks trade tolls, the Light flies)
 * Tap or swipe the picture, or press Next; Skip leaves at once. Reduced motion holds each
 * picture still.
 */
import { Move, scoreTurn } from "@arena/strategies";
import {
	AnimatePresence,
	motion,
	type PanInfo,
	useReducedMotion,
} from "motion/react";
import {
	type ReactNode,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { buzz, play as cue, useSfx } from "@/audio";
import { fx, PALETTES } from "@/fx";
import { L } from "@/lexicon";
import { onboarding as T } from "@/lexicon/onboarding";
import { PrimaryButton } from "@/ui/button";
import { TextButton } from "@/ui/controls";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { spring } from "@/ui/motion";
import { Count } from "@/ui/type";
import { MoveGlyph } from "./MoveGlyph";
import s from "./premise.module.css";

const BEATS = T.premise.beats.length;
const WARM = ["devour", "unveil"] as const;
/** A swipe this far (px) turns the beat. */
const SWIPE = 50;

const beatSwap = {
	enter: (d: number) => ({ opacity: 0, x: 40 * d, filter: "blur(6px)" }),
	center: { opacity: 1, x: 0, filter: "blur(0px)" },
	exit: (d: number) => ({ opacity: 0, x: -32 * d, filter: "blur(4px)" }),
};

export function Premise({ onDone }: { onDone: () => void }) {
	const [beat, setBeat] = useState(0);
	const [dir, setDir] = useState(1);
	const reduce = useReducedMotion() ?? false;
	const btn = useRef<HTMLButtonElement>(null);
	const panned = useRef(false);
	const last = beat === BEATS - 1;
	const line = T.premise.beats[beat] ?? T.premise.beats[0];
	useSfx(WARM);

	const go = (d: number) => {
		const to = beat + d;
		if (to >= BEATS) {
			onDone();
			return;
		}
		if (to < 0) return;
		setDir(d);
		setBeat(to);
		cue("unveil", { volume: 0.45, rate: 1 + to * 0.08 });
	};

	useEffect(() => {
		btn.current?.focus();
	}, []);
	// Arrow keys turn the beats too; Escape skips.
	const onKey = useEffectEvent((e: KeyboardEvent) => {
		if (e.key === "ArrowRight") go(1);
		else if (e.key === "ArrowLeft") go(-1);
		else if (e.key === "Escape") onDone();
	});
	useEffect(() => {
		const key = (e: KeyboardEvent) => onKey(e);
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, []);

	const pan = (_: unknown, { offset }: PanInfo) => {
		if (offset.x < -SWIPE) {
			buzz(8);
			go(1);
		} else if (offset.x > SWIPE) {
			buzz(8);
			go(-1);
		}
	};

	if (typeof document === "undefined") return null;
	return createPortal(
		<motion.div
			className={s.root}
			role="dialog"
			aria-modal="true"
			aria-label={T.premise.label}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: 0.3 } }}
			transition={{ duration: 0.4 }}
		>
			<div className={s.top}>
				<ol className={s.pips} aria-hidden="true">
					{T.premise.beats.map((b, i) => (
						<li
							key={b.head}
							className={s.pip}
							data-on={i <= beat || undefined}
						/>
					))}
				</ol>
				<span className="sr-only" aria-live="polite">
					{T.premise.beat(beat + 1, BEATS)}
				</span>
				<TextButton onClick={onDone}>{T.skip}</TextButton>
			</div>

			{/* The picture turns on a tap or a swipe; the button below does the same for keys. */}
			<motion.div
				className={s.stage}
				onPanStart={() => {
					panned.current = true;
				}}
				onPanEnd={pan}
				onClick={() => {
					if (panned.current) {
						panned.current = false;
						return;
					}
					go(1);
				}}
				style={{ touchAction: "pan-y" }}
				aria-hidden="true"
			>
				<AnimatePresence mode="wait" custom={dir} initial={false}>
					<motion.div
						key={beat}
						className={s.picture}
						custom={dir}
						variants={beatSwap}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
					>
						{beat === 0 ? (
							<Shattered reduce={reduce} />
						) : beat === 1 ? (
							<MaskRing reduce={reduce} />
						) : (
							<Duo reduce={reduce} />
						)}
					</motion.div>
				</AnimatePresence>
			</motion.div>

			<div className={s.words} aria-live="polite">
				<AnimatePresence mode="wait" custom={dir} initial={false}>
					<motion.div
						key={beat}
						custom={dir}
						variants={beatSwap}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
					>
						<h2 className={s.head}>{line.head}</h2>
						<p className={s.body}>{line.body}</p>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className={s.foot}>
				<PrimaryButton ref={btn} legacy="btn btn-blood" onClick={() => go(1)}>
					{last ? T.premise.start : T.premise.next}
				</PrimaryButton>
				<p className={s.hint} aria-hidden="true">
					{T.premise.swipe}
				</p>
			</div>
		</motion.div>,
		document.body,
	);
}

// ---------------------------------------------------------------- I: the glass

/** Shards of the window, drawn: they drift down from the break, forever (or hang, still). */
const SHARDS = [
	{ x: -38, r: -24, d: 0, w: 14, c: "#c9a24f" },
	{ x: 30, r: 32, d: 0.7, w: 10, c: "#3f7fc0" },
	{ x: -8, r: 12, d: 1.4, w: 12, c: "#a3172f" },
	{ x: 46, r: -40, d: 2.1, w: 8, c: "#86c9a3" },
	{ x: -52, r: 50, d: 2.8, w: 9, c: "#6a4fa0" },
	{ x: 14, r: -8, d: 3.4, w: 11, c: "#f0cf7a" },
] as const;

function Shattered({ reduce }: { reduce: boolean }) {
	const glass = useRef<HTMLDivElement>(null);
	// The break: a spray of glass off the window as the beat lands.
	useEffect(() => {
		const t = setTimeout(() => {
			if (!glass.current) return;
			cue("devour", { volume: 0.45, rate: 0.7 });
			fx.burst("shards", glass.current, {
				amount: 0.9,
				palette: PALETTES.glass,
				spread: 40,
			});
		}, 450);
		return () => clearTimeout(t);
	}, []);
	return (
		<div className={s.glassScene}>
			<span className={s.halo} aria-hidden="true" />
			<motion.div
				ref={glass}
				className={s.window}
				initial={reduce ? false : { scale: 1.04, rotate: 0 }}
				animate={
					reduce ? {} : { scale: 1, rotate: [0, -1.2, 0.8, 0], y: [0, 2, 0] }
				}
				transition={{ duration: 0.5, delay: 0.42 }}
			>
				<GlassWindow aspect={2} mood="broken" mask={false} />
			</motion.div>
			<div className={s.shards} aria-hidden="true">
				{SHARDS.map((h) => (
					<motion.span
						key={`${h.x}${h.r}`}
						className={s.shard}
						style={{
							left: `calc(50% + ${h.x}px)`,
							width: h.w,
							height: h.w * 1.6,
							background: h.c,
						}}
						initial={{ y: 0, opacity: 0, rotate: h.r }}
						animate={
							reduce
								? { y: 40, opacity: 0.7, rotate: h.r }
								: {
										y: [0, 140],
										opacity: [0, 0.9, 0],
										rotate: [h.r, h.r + 120],
									}
						}
						transition={
							reduce
								? { duration: 0 }
								: {
										duration: 3.6,
										delay: 0.6 + h.d,
										repeat: Number.POSITIVE_INFINITY,
										ease: "easeIn",
									}
						}
					/>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------- II: the masks

const ASPECTS = L.aspects.length;
/** Radius of the ring of small masks, in px. */
const RING = 112;

function MaskRing({ reduce }: { reduce: boolean }) {
	const [on, setOn] = useState(2);
	useEffect(() => {
		if (reduce) return;
		const t = setInterval(() => setOn((i) => (i + 1) % ASPECTS), 1500);
		return () => clearInterval(t);
	}, [reduce]);
	const a = L.aspects[on] ?? L.aspects[0];
	return (
		<div className={s.ringScene}>
			<span className={s.halo} aria-hidden="true" />
			{L.aspects.map((x, i) => {
				const t = (i / ASPECTS) * Math.PI * 2 - Math.PI / 2;
				return (
					<motion.span
						key={x.key}
						className={s.ringMask}
						data-on={i === on || undefined}
						style={{
							left: `calc(50% + ${Math.cos(t) * RING}px)`,
							top: `calc(50% + ${Math.sin(t) * RING}px)`,
						}}
						initial={reduce ? false : { opacity: 0, scale: 0.4 }}
						animate={{ opacity: 1, scale: i === on ? 1.18 : 1 }}
						transition={{ ...spring.settle, delay: reduce ? 0 : 0.05 * i }}
					>
						<Mask aspect={i} size={40} shadow={false} />
					</motion.span>
				);
			})}
			<div className={s.ringHeart}>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={on}
						className={s.ringBig}
						initial={
							reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -8 }
						}
						animate={{ opacity: 1, scale: 1, rotate: 0 }}
						exit={
							reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: 8 }
						}
						transition={spring.settle}
					>
						<Mask aspect={on} size={112} glow />
						<span className={s.ringName}>{a.name}</span>
					</motion.span>
				</AnimatePresence>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------- III: the duel

const { Cooperate: K, Defect: D } = Move;
/** A few tolls of an Echo against a fickle rival: trust, a betrayal, an answer, trust again. */
const SCRIPT: readonly [Move, Move][] = [
	[K, K],
	[K, D],
	[D, K],
	[K, K],
	[K, K],
];
/** How far the Light flies from the middle to a mask (px). */
const REACH = 96;

function Duo({ reduce }: { reduce: boolean }) {
	const [toll, setToll] = useState(0);
	const [totals, setTotals] = useState<[number, number]>(() => {
		const [m, t] = SCRIPT[0] ?? [K, K];
		const [a, b] = scoreTurn(m, t);
		return [a, b];
	});
	useEffect(() => {
		if (reduce) return;
		let n = 0;
		let land: ReturnType<typeof setTimeout> | undefined;
		const t = setInterval(() => {
			n += 1;
			const [m, th] = SCRIPT[n % SCRIPT.length] ?? [K, K];
			const [a, b] = scoreTurn(m, th);
			setToll(n);
			// The Light lands as the motes arrive.
			land = setTimeout(() => setTotals((v) => [v[0] + a, v[1] + b]), 650);
		}, 1900);
		return () => {
			clearInterval(t);
			clearTimeout(land);
		};
	}, [reduce]);
	const [mine, theirs] = SCRIPT[toll % SCRIPT.length] ?? [K, K];
	const light = scoreTurn(mine, theirs);

	return (
		<div className={s.duoScene}>
			<span className={s.halo} aria-hidden="true" />
			<div className={s.duo}>
				<DuoSide
					label={T.premise.you}
					mask={<Mask aspect={2} size={88} glow />}
					move={mine}
					total={totals[0]}
					toll={toll}
					reduce={reduce}
				/>
				<div className={s.motes} aria-hidden="true">
					{reduce
						? null
						: ([0, 1] as const).flatMap((side) => {
								const gain = light[side] ?? 0;
								const toward = side === 0 ? -REACH : REACH;
								// Torn from the one devoured, or risen between the two.
								const stolen =
									(side === 0 ? mine : theirs) === D &&
									(side === 0 ? theirs : mine) === K;
								const from = stolen ? -toward : 0;
								return Array.from({ length: gain }, (_, k) => (
									<motion.span
										// biome-ignore lint/suspicious/noArrayIndexKey: motes are positional per toll
										key={`${toll}-${side}-${k}`}
										className={s.mote}
										initial={{ x: from, y: 0, opacity: 0, scale: 0.6 }}
										animate={{
											x: toward,
											y: [0, -18 - k * 4, 0],
											opacity: [0, 1, 1, 0],
											scale: [0.6, 1.2, 0.8],
										}}
										transition={{
											duration: 0.7,
											delay: 0.25 + k * 0.07,
											ease: "easeOut",
										}}
									/>
								));
							})}
				</div>
				<DuoSide
					label={T.premise.rival}
					mask={<Mask aspect={6} size={88} variant="grisaille" />}
					move={theirs}
					total={totals[1]}
					toll={toll}
					reduce={reduce}
					them
				/>
			</div>
		</div>
	);
}

function DuoSide({
	label,
	mask,
	move,
	total,
	toll,
	reduce,
	them = false,
}: {
	label: string;
	mask: ReactNode;
	move: Move;
	total: number;
	toll: number;
	reduce: boolean;
	them?: boolean;
}) {
	return (
		<div className={s.duoSide}>
			<div className={s.duoMask}>{mask}</div>
			<span className={s.duoTile}>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={toll}
						className={s.duoFace}
						data-move={move === D ? "devour" : "kindle"}
						initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
						animate={{ opacity: 1, rotateY: 0 }}
						exit={{ opacity: 0, transition: { duration: 0.1 } }}
						transition={{ ...spring.slam, delay: them ? 0.1 : 0 }}
					>
						<MoveGlyph devour={move === D} className={s.duoGlyph} />
					</motion.span>
				</AnimatePresence>
			</span>
			<span className={s.duoWho}>{label}</span>
			<span className={s.duoTotal}>
				<Count
					value={total}
					tone="gilt"
					size="md"
					unit={T.practice.light}
					showDelta={false}
				/>
			</span>
		</div>
	);
}
