"use client";

/**
 * The practice duel: while the new Fragment wakes, first the rule (./Rule: the four outcomes of
 * a toll, tapped through on a card), then three tolls against a Remnant. The player does not
 * choose: each tap on Unveil turns both cards (what the Fragment chose by its mask, and what
 * the Remnant chose) and the Light each side draws, with the rule that toll showed spelled out
 * under it. The moves are the real rules (@arena/strategies decide()) with the player's own
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
import { buzz, play as cue, HAPTIC, useSfx } from "@/audio";
import { FX, fx, PALETTES } from "@/fx";
import { remnantAt, remnantConfig } from "@/game/spire";
import { onboarding as T } from "@/lexicon/onboarding";
import { PrimaryButton } from "@/ui/button";
import { TextButton } from "@/ui/controls";
import { Mask } from "@/ui/Mask";
import { IMPACT, impact, spring, useShake } from "@/ui/motion";
import { Count, Rubric } from "@/ui/type";
import { MoveGlyph } from "./MoveGlyph";
import s from "./practice.module.css";
import { outcomeOf, Rule, toneOf } from "./Rule";

const TOLLS = 3;
/** The verdict strikes as the cards finish turning (ms after the tap). */
const STRIKE_MS = 200;
/** Most motes of Light flown per side per toll (the last carries any remainder). */
const MOTES = 6;
/** The Gathering's verdict, at practice scale. */
const SMALL = { amount: 0.45, scale: 0.8 } as const;
const WARM = ["unveil", "kindle", "devour", "light"] as const;
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
	const [phase, setPhase] = useState<"rule" | "duel">("rule");
	const [shown, setShown] = useState(0);
	const reduce = useReducedMotion() ?? false;
	const shaker = useShake<HTMLDivElement>();
	const go = useRef<HTMLButtonElement>(null);
	const root = useRef<HTMLDivElement>(null);
	const over = shown >= TOLLS;
	const last = shown > 0 ? tolls[shown - 1] : null;
	// The totals fill as each mote of Light lands (at once when particles are off).
	const [totals, setTotals] = useState<[number, number]>([0, 0]);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	useSfx(WARM);

	useEffect(() => {
		const ts = timers.current;
		return () => {
			for (const t of ts) clearTimeout(t);
		};
	}, []);
	// The rule takes the focus first; the duel's button once it opens.
	useEffect(() => {
		if (phase === "duel") go.current?.focus();
	}, [phase]);

	/** The verdict of one toll: sound, particles, the shake, and the Light flown home. */
	const strike = (t: PracticeToll) => {
		const el = (sel: string) =>
			root.current?.querySelector<HTMLElement>(sel) ?? null;
		const card = (k: Who) => el(`[data-card="${k}"]`);
		const devours = [t.mine === Move.Defect, t.theirs === Move.Defect] as const;
		if (devours[0] && devours[1]) {
			cue("devour", { volume: 0.7, rate: 0.84 });
			cue("devour", { volume: 0.5, rate: 0.72, delay: 150 });
			void impact(shaker, { ...IMPACT.devour, buzz: false });
			for (const k of ["me", "them"] as const) {
				const c = card(k);
				if (c) fx.burst("shards", c, SMALL);
			}
			buzz(HAPTIC.devour);
		} else if (devours[0] || devours[1]) {
			const victim: Who = devours[0] ? "them" : "me";
			const c = card(victim);
			cue("devour", { volume: 0.75 });
			void impact(shaker, { ...IMPACT.devour, buzz: false });
			if (c) {
				fx.burst("shards", c, SMALL);
				fx.burst("shards", c, { ...SMALL, palette: PALETTES.devour });
				fx.ring(c, FX.blood, { radius: 56 });
			}
			if (victim === "me") buzz(HAPTIC.devour);
		} else {
			cue("kindle", { volume: 0.8 });
			void impact(shaker, { ...IMPACT.kindle, buzz: false });
			for (const k of ["me", "them"] as const) {
				const c = card(k);
				if (c) fx.burst("kindle", c, SMALL);
			}
		}
		// Each side's Light: torn from the one it devoured, or risen between the two.
		(["me", "them"] as const).forEach((k, side) => {
			const gain = t.light[side] ?? 0;
			const to = el(`[data-total="${k}"]`);
			if (gain <= 0) return;
			const n = Math.min(MOTES, gain);
			const prey: Who = k === "me" ? "them" : "me";
			const from =
				devours[side] && !devours[1 - side] ? card(prey) : el("[data-vs]");
			const land = (i: number) => {
				const add = i === n - 1 ? gain - (n - 1) : 1;
				setTotals((v) =>
					side === 0 ? [v[0] + add, v[1]] : [v[0], v[1] + add],
				);
				cue("light", { rate: 1 + i * 0.06, pitchJitter: 0.15, volume: 0.85 });
			};
			if (!from || !to) {
				for (let i = 0; i < n; i++) land(i);
				return;
			}
			void fx.stream(from, to, {
				count: n,
				duration: 0.55,
				stagger: 0.07,
				size: 3,
				onArrive: land,
			});
		});
	};

	const unveil = () => {
		if (over) return;
		const t = tolls[shown];
		setShown((n) => n + 1);
		if (!t) return;
		cue("unveil", { volume: 0.8 });
		timers.current.push(setTimeout(() => strike(t), STRIKE_MS));
	};

	if (typeof document === "undefined") return null;
	return createPortal(
		<motion.div
			ref={root}
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
					{phase === "rule" ? T.rule.heading : T.practice.heading}
				</Rubric>
				{/* Skipping the rule lands on the duel, which still labels each outcome. */}
				<TextButton
					onClick={phase === "rule" ? () => setPhase("duel") : onDone}
				>
					{T.skip}
				</TextButton>
			</div>

			<AnimatePresence mode="wait" initial={false}>
				{phase === "rule" ? (
					<Rule key="rule" onDone={() => setPhase("duel")} />
				) : (
					<motion.div
						key="duel"
						className={s.phase}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={spring.settle}
					>
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
										<span
											data-move={i < shown ? moveKey(t.theirs) : undefined}
										/>
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
								<span className={s.vs} aria-hidden="true" data-vs>
									✠
								</span>
								<Side
									who={REMNANT.name}
									mask={
										<Mask
											aspect={REMNANT.aspect}
											size={84}
											variant="grisaille"
										/>
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
									<motion.p
										key={`o${shown}`}
										className={s.explain}
										data-tone={
											last
												? toneOf(outcomeOf(last.mine, last.theirs))
												: undefined
										}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, transition: { duration: 0.12 } }}
										transition={{ ...spring.settle, delay: last ? 0.3 : 0 }}
									>
										{last
											? T.practice.outcome[outcomeOf(last.mine, last.theirs)]
											: T.practice.intro}
									</motion.p>
								</AnimatePresence>
								<AnimatePresence>
									{over ? (
										<motion.p
											key="end"
											className={s.end}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ ...spring.settle, delay: 1.1 }}
										>
											{T.practice.end}
										</motion.p>
									) : null}
								</AnimatePresence>
							</div>
						</div>

						<div className={s.foot}>
							<PrimaryButton
								ref={go}
								legacy="btn btn-blood"
								onClick={over ? onDone : unveil}
							>
								{over ? T.practice.go : T.practice.unveil}
							</PrimaryButton>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>,
		document.body,
	);
}

const moveKey = (m: Move) => (m === Move.Defect ? "devour" : "kindle");

type Who = "me" | "them";

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
			<div className={s.cardSlot} data-card={them ? "them" : "me"}>
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
								<MoveGlyph devour={move === Move.Defect} className={s.glyph} />
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
			<div className={s.total} data-total={them ? "them" : "me"}>
				<Count value={total} tone="gilt" size="lg" showDelta={false} />
				<span className={s.unit}>{T.practice.light}</span>
			</div>
		</div>
	);
}
