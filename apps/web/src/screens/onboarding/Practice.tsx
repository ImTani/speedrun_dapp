"use client";

/**
 * The practice duel: while the new Fragment wakes, the player plays three tolls against a
 * Remnant by hand. Each tap on Unveil turns both cards: Kindle or Devour, and the Light each
 * side draws. The moves are the real rules (@arena/strategies decide()) with the player's own
 * Aspect and Sigils against a fixed Remnant, simulated here; nothing is sent anywhere.
 */
import {
	type AgentConfig,
	DEFAULT_KNOBS,
	decide,
	Move,
	StrategyId,
	scoreTurn,
	type Turn,
} from "@arena/strategies";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Hex } from "viem";
import { remnantAt, remnantConfig } from "@/game/spire";
import { onboarding as T } from "@/lexicon/onboarding";
import { Mask } from "@/ui/Mask";
import {
	haptic,
	IMPACT,
	impact,
	pressable,
	spring,
	useShake,
} from "@/ui/motion";
import { Count, Rubric } from "@/ui/type";
import s from "./practice.module.css";

const TOLLS = 3;
/** The Remnant met in practice: Degree VII, floor 2 (it chooses by chance). */
const REMNANT = remnantAt(7, 2);
const MY_SEED = `0x${"a7".repeat(32)}` as Hex;
const seedOf = (i: number) =>
	`0x${i.toString(16).padStart(2, "0").repeat(32)}` as Hex;

export interface PracticeToll {
	mine: Move;
	theirs: Move;
	light: [number, number];
}

function play(mine: AgentConfig, theirs: AgentConfig, theirSeed: Hex) {
	const a: Turn[] = [];
	const b: Turn[] = [];
	const out: PracticeToll[] = [];
	for (let i = 0; i < TOLLS; i++) {
		const ctx = { boutId: 0n, matchIndex: 0n, moveIndex: BigInt(i) };
		const m = decide({ config: mine, history: a, seed: MY_SEED, ctx });
		const t = decide({ config: theirs, history: b, seed: theirSeed, ctx });
		a.push({ mine: m, theirs: t });
		b.push({ mine: t, theirs: m });
		out.push({ mine: m, theirs: t, light: scoreTurn(m, t) });
	}
	return out;
}

/**
 * Three tolls of the player's config against the practice Remnant. The Remnant's seed is the
 * first that shows both a Kindle and a Devour, opening with a Kindle, so every player sees
 * each move once.
 */
export function practiceDuel(mine: AgentConfig): PracticeToll[] {
	const theirs = remnantConfig(REMNANT);
	let cfg = mine;
	try {
		play(cfg, theirs, seedOf(1));
	} catch {
		cfg = { strategy: StrategyId.TitForTat, knobs: DEFAULT_KNOBS };
	}
	let fallback: PracticeToll[] | null = null;
	for (let i = 1; i < 96; i++) {
		const run = play(cfg, theirs, seedOf(i));
		const moves = run.map((x) => x.theirs);
		const both = moves.includes(Move.Cooperate) && moves.includes(Move.Defect);
		if (both && moves[0] === Move.Cooperate) return run;
		if (both && !fallback) fallback = run;
	}
	return fallback ?? play(cfg, theirs, seedOf(1));
}

export function Practice({
	config,
	name,
	onDone,
}: {
	config: AgentConfig;
	name: string;
	onDone: () => void;
}) {
	const tolls = useMemo(() => practiceDuel(config), [config]);
	const [shown, setShown] = useState(0);
	const reduce = useReducedMotion() ?? false;
	const shaker = useShake<HTMLDivElement>();
	const go = useRef<HTMLButtonElement>(null);
	const over = shown >= TOLLS;
	const last = shown > 0 ? tolls[shown - 1] : null;
	const totals = tolls
		.slice(0, shown)
		.reduce<[number, number]>(
			(acc, t) => [acc[0] + t.light[0], acc[1] + t.light[1]],
			[0, 0],
		);

	useEffect(() => {
		go.current?.focus();
	}, []);

	const unveil = () => {
		if (over) return;
		const t = tolls[shown];
		setShown((n) => n + 1);
		if (!t) return;
		if (t.mine === Move.Defect || t.theirs === Move.Defect) {
			haptic([10, 30, 16]);
			void impact(shaker, IMPACT.devour);
		} else {
			haptic(10);
		}
	};

	if (typeof document === "undefined") return null;
	return createPortal(
		<motion.div
			className={s.root}
			role="dialog"
			aria-modal="true"
			aria-label={T.practice.label}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: 0.25 } }}
		>
			<div className={s.top}>
				<Rubric tone="dim" size="xs">
					{T.practice.heading}
				</Rubric>
				<button type="button" className={s.skip} onClick={onDone}>
					{T.skip}
				</button>
			</div>

			<div className={s.body} ref={shaker.ref}>
				<p className={s.toll} aria-live="polite">
					{T.practice.toll(Math.max(1, shown), TOLLS)}
				</p>
				<ol className={s.history} aria-hidden="true">
					{tolls.map((t, i) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: three fixed tolls
							key={i}
							className={s.hpair}
							data-on={i < shown || undefined}
							data-now={i === shown || undefined}
						>
							<span data-move={i < shown ? moveKey(t.mine) : undefined} />
							<span data-move={i < shown ? moveKey(t.theirs) : undefined} />
						</li>
					))}
				</ol>

				<div className={s.sides}>
					<Side
						who={name}
						mask={<Mask aspect={config.strategy} size={84} glow />}
						move={last?.mine ?? null}
						gain={last?.light[0] ?? 0}
						total={totals[0]}
						turn={shown}
						reduce={reduce}
					/>
					<span className={s.vs} aria-hidden="true">
						✠
					</span>
					<Side
						who={REMNANT.name}
						mask={
							<Mask aspect={REMNANT.aspect} size={84} variant="grisaille" />
						}
						move={last?.theirs ?? null}
						gain={last?.light[1] ?? 0}
						total={totals[1]}
						turn={shown}
						reduce={reduce}
						them
					/>
				</div>

				{last ? (
					<p className="sr-only" aria-live="polite">
						{T.practice.said(
							last.mine === Move.Defect,
							last.theirs === Move.Defect,
							last.light[0],
							last.light[1],
						)}
					</p>
				) : null}

				<div className={s.lineBox}>
					<AnimatePresence mode="wait" initial={false}>
						{over ? (
							<motion.p
								key="end"
								className={s.end}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring.settle, delay: 0.35 }}
							>
								{T.practice.end}
							</motion.p>
						) : shown >= 1 ? (
							<motion.p
								key="explain"
								className={s.explain}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, transition: { duration: 0.12 } }}
								transition={{ ...spring.settle, delay: 0.3 }}
							>
								{T.practice.explain}
							</motion.p>
						) : null}
					</AnimatePresence>
				</div>
			</div>

			<div className={s.foot}>
				<motion.button
					ref={go}
					type="button"
					className="btn btn-blood"
					onClick={over ? onDone : unveil}
					{...pressable}
				>
					{over ? T.practice.go : T.practice.unveil}
				</motion.button>
			</div>
		</motion.div>,
		document.body,
	);
}

const moveKey = (m: Move) => (m === Move.Defect ? "devour" : "kindle");

function Side({
	who,
	mask,
	move,
	gain,
	total,
	turn,
	reduce,
	them = false,
}: {
	who: string;
	mask: ReactNode;
	move: Move | null;
	gain: number;
	total: number;
	turn: number;
	reduce: boolean;
	them?: boolean;
}) {
	return (
		<div className={s.side} data-them={them || undefined}>
			<div className={s.mask}>{mask}</div>
			<p className={s.who}>{who}</p>
			<div className={s.cardSlot}>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.div
						key={turn}
						className={s.card}
						data-move={move == null ? "veiled" : moveKey(move)}
						initial={
							reduce ? { opacity: 0 } : { opacity: 0, rotateY: 90, scale: 1.15 }
						}
						animate={{ opacity: 1, rotateY: 0, scale: 1 }}
						exit={
							reduce
								? { opacity: 0, transition: { duration: 0.1 } }
								: { opacity: 0, rotateY: -90, transition: { duration: 0.14 } }
						}
						transition={{
							...spring.slam,
							delay: them ? 0.12 : 0,
							opacity: { duration: 0.12, delay: them ? 0.12 : 0 },
						}}
					>
						{move == null ? (
							<span className={s.veil} aria-hidden="true">
								?
							</span>
						) : (
							<>
								<MoveGlyph devour={move === Move.Defect} />
								<span className={s.moveName}>
									{move === Move.Defect ? T.practice.devour : T.practice.kindle}
								</span>
							</>
						)}
					</motion.div>
				</AnimatePresence>
				<AnimatePresence>
					{move != null ? (
						<motion.span
							key={`g${turn}`}
							className={s.gain}
							data-zero={gain === 0 || undefined}
							initial={
								reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.6 }
							}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, transition: { duration: 0.1 } }}
							transition={{ ...spring.slam, delay: (them ? 0.12 : 0) + 0.25 }}
						>
							+{gain}
						</motion.span>
					) : null}
				</AnimatePresence>
			</div>
			<div className={s.total}>
				<Count value={total} tone="gilt" size="lg" showDelta={false} />
				<span className={s.unit}>{T.practice.light}</span>
			</div>
		</div>
	);
}

/** Kindle: a candle flame. Devour: a fanged maw. */
function MoveGlyph({ devour }: { devour: boolean }) {
	return devour ? (
		<svg viewBox="0 0 40 40" className={s.glyph} aria-hidden="true">
			<path
				d="M5 12 Q20 4 35 12 L31 18 L27 13 L24 19 L20 13 L16 19 L13 13 L9 18 Z M7 28 Q20 37 33 28 L29 23 L25 28 L22 22 L18 22 L15 28 L11 23 Z"
				fill="#c7262c"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
		</svg>
	) : (
		<svg viewBox="0 0 40 40" className={s.glyph} aria-hidden="true">
			<path
				d="M20 3 C26 12 31 17 31 25 A11 11 0 0 1 9 25 C9 18 14 15 16 9 C18 14 21 15 20 3 Z"
				fill="#f2c25a"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
			<path
				d="M20 17 C23 22 25 24 25 28 A5 5 0 0 1 15 28 C15 24 18 22 20 17 Z"
				fill="#fff1c8"
			/>
		</svg>
	);
}
